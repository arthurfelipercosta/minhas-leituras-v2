// functions/src/index.ts
// import de pacotes
import {setGlobalOptions} from "firebase-functions";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// Para controle de custo, você pode definir o número máximo de instâncias.
setGlobalOptions({maxInstances: 10});

export const scheduledAccountDeletion = onSchedule(
  "every 24 hours",
  async () => {
    const now = new Date();

    // Busca usuários com exclusão pendente e data de agendamento <= hoje
    const usersToDeleteSnap = await db.collection("users")
      .where("isPendingDeletion", "==", true)
      .where(
        "deletionScheduledDate",
        "<=",
        admin.firestore.Timestamp.fromDate(now))
      .get();

    if (usersToDeleteSnap.empty) {
      console.log("Nenhum usuário agendado para exclusão.");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deletionPromises: Promise<any>[] = [];

    usersToDeleteSnap.forEach((userDoc) => {
      const userId = userDoc.id;
      console.log(`Processando exclusão do usuário: ${userId}`);

      // 1. Excluir dados do Firestore
      deletionPromises.push(userDoc.ref.delete());

      // 2. Excluir pasta do Storage
      const bucket = storage.bucket();
      deletionPromises.push(
        bucket
          .deleteFiles({
            prefix: `users/${userId}/`,
            force: true,
          })
          .then(() => {
            console.log(`Arquivos do Storage para ${userId} excluídos.`);
          })
          .catch((error) =>
            console.error(
              `Erro ao excluir arquivos do Storage para ${userId}:`,
              error
            )
          )
      );

      // 3. Excluir o usuário do Firebase Authentication
      deletionPromises.push(
        admin
          .auth()
          .deleteUser(userId)
          .then(() => console.log(`Usuário Auth ${userId} excluído.`))
          .catch((error) =>
            console.error(`Erro ao excluir usuário Auth ${userId}:`, error)
          )
      );
    });

    await Promise.all(deletionPromises);
    console.log("Processo de exclusão concluído.");
  });

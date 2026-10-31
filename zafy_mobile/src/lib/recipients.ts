import { File, Paths } from 'expo-file-system';

/**
 * Adresse utilisée pour chaque envoi (id du paiement → adresse).
 * Breez ne garde pas l'adresse Spark du destinataire : on la note pour afficher le contact dans l'historique.
 */
type Recipients = Record<string, string>;

const file = () => new File(Paths.document, 'destinataires.json');
let cache: Recipients | null = null;

export async function loadRecipients(): Promise<Recipients> {
  if (cache) return cache;
  const f = file();
  try {
    cache = f.exists ? (JSON.parse(await f.text()) as Recipients) : {};
  } catch {
    cache = {};
  }
  return cache;
}

export async function rememberRecipient(paymentId: string, address: string) {
  const recipients = { ...(await loadRecipients()), [paymentId]: address };
  const f = file();
  if (!f.exists) f.create();
  await f.write(JSON.stringify(recipients));
  cache = recipients;
}

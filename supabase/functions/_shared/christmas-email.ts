export const defaultChristmasEmail = {
  subject: 'A private holiday season sale — 15% off, just for our clients / Une vente privée du temps des Fêtes — 15 % de rabais, réservée à notre clientèle',
  preview: "We're making room for the new collection — and our clients shop first. / Nous faisons place à la nouvelle collection — notre clientèle en profite en premier.",
  catalogUrl: '', from: '', replyTo: '',
  english: `A HOLIDAY SEASON FLASH SALE, JUST FOR YOU

Dear friends — as the year turns, we're making room in the showroom for a new collection. Before anything changes, we wanted the pieces we've loved carrying to go first to the clients who have supported us.

So, for a short time, we're offering 15% off a private selection of 157 pieces from our showroom — earrings, necklaces, bracelets, pendants and rings, each one photographed and priced in the collection.

Every piece is one of a kind. When it's gone, it's gone — and this sale won't be advertised anywhere else. If something catches your eye, reply to this email, call us, or visit the showroom and we'll set it aside for you.

Thank you for being part of our year. We wish you and your family a warm and sparkling holiday season.

With our thanks,

Lawrence

HR Lawrence Fine Jewelry

1255 Phillips Square, Suite 1105 · Montreal

15% off the listed price, for existing clients only. Each piece is unique — once sold, it cannot be restocked.`,
  french: `UNE VENTE ÉCLAIR DU TEMPS DES FÊTES, JUSTE POUR VOUS

Chers amis, à l’approche de la fin de l’année, nous faisons place à une nouvelle collection dans notre salle d’exposition. Avant ce changement, nous souhaitions offrir en priorité les pièces que nous avons tant aimé présenter à la clientèle qui nous a soutenus.

Pour une courte période, nous vous offrons donc 15 % de rabais sur une sélection privée de 157 bijoux de notre salle d’exposition — boucles d’oreilles, colliers, bracelets, pendentifs et bagues. Chaque pièce est photographiée et présentée avec son prix dans le catalogue.

Chaque pièce est unique. Une fois vendue, elle ne sera plus disponible — et cette vente ne sera annoncée nulle part ailleurs. Si un bijou attire votre attention, répondez à ce courriel, appelez-nous ou passez à notre salle d’exposition : nous le mettrons de côté pour vous.

Merci d’avoir fait partie de notre année. Nous vous souhaitons, à vous et à votre famille, un temps des Fêtes chaleureux et étincelant.

Avec toute notre gratitude,

Lawrence

HR Lawrence Fine Jewelry

1255, square Phillips, bureau 1105 · Montréal

15 % de rabais sur le prix affiché, exclusivement pour notre clientèle existante. Chaque pièce est unique — une fois vendue, elle ne pourra pas être réapprovisionnée.`
};
export type ChristmasEmail = typeof defaultChristmasEmail;
export const normalizedEmail = (email: string) => email.trim().toLowerCase();
export function usableEmail(email: string) {
  const e = normalizedEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
  const [local, domain] = e.split('@');
  if (['no','none','noemail','no-email','na','n/a','test','x','email','nomail','unknown'].includes(local)) return false;
  return !['email.com','test.com','x.com','na.com','placeholder.com'].includes(domain);
}
export function uniqueRecipients<T extends { email: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter(row => { const e = normalizedEmail(row.email); if (!usableEmail(e) || seen.has(e)) return false; seen.add(e); return true; });
}
export const staffMaySend = (roles: string[]) => roles.some(role => role === 'admin' || role === 'staff');

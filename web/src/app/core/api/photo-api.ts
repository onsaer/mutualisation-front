/** Envoi de photos d'annonce. Renvoie l'adresse de la photo, à mettre dans `photoUrls`. */
export abstract class PhotoApi {
  abstract upload(photo: Blob): Promise<string>;
}

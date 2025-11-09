import { google } from "googleapis";

async function getPublicDriveUrl(auth, fileId) {
  const drive = google.drive({ version: 'v3', auth });
  
  // Make the file publicly readable (type: anyone)
  await drive.permissions.create({
    fileId: fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  // Get the file metadata to find the direct download link
  const fileResponse = await drive.files.get({
    fileId: fileId,
    fields: 'webContentLink',
  });

  if (!fileResponse.data.webContentLink) {
    throw new Error('Could not get public URL for Drive file.');
  }

  console.log(`Public URL for file ${fileId}: ${fileResponse.data.webContentLink}`);
  // Note: You might want to delete this public permission later.
  return fileResponse.data.webContentLink;
}
    


export default getPublicDriveUrl;
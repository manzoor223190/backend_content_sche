import axios from "axios";

async function checkContainerStatus(containerId, accessToken) {
    // console.log("containerId", containerId);
    // console.log("access token", accessToken);
    
  const fields = 'status_code,status,error_message';
  const statusUrl = `https://graph.instagram.com/${containerId}?fields=${fields}&access_token=${accessToken}`;

  try {
    const response = await axios.get(statusUrl);
    const { status_code, error_message } = response.data;

    // console.log(`Container ${containerId} status: ${status_code}`);

    if (status_code === 'ERROR') {
      const apiErrorMessage = `Instagram failed to process the video: ${error_message || 'Unknown error.'}`;
      console.error(apiErrorMessage);
      throw new Error(apiErrorMessage);
    }

    return status_code;

  } catch (error) {
    if (error.response) {
      const detailedError = error.response.data.error?.message || 'Failed to check container status.';
      console.error('Error checking container status:', detailedError);
      throw new Error(detailedError);
    }
    throw error;
  }
}

export default checkContainerStatus;




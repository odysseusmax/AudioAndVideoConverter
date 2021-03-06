linkBox = document.getElementById('link');
linkBox.addEventListener('mousedown', paste);

async function paste() {
    const text = await navigator.clipboard.readText();
    document.getElementById("link").value = text;
  }

const alertWrapper = document.getElementById("alert_wrapper");

function show_alert(message, type) {
    alertWrapper.style.display = 'block';
    alertWrapper.innerHTML =
    `<div class="alert alert-${type}" role="alert">
      ${message}
    </div>`
}

// A function that creates a synchronous sleep.
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function showDownloadProgress() {
    while (shouldLog) {
        try {
            const response = await fetch(`static/progress/${responseFromServer}.txt`);
            const textInFile = await response.text();
            lines = textInFile.split('\n');
            secondLastLine = lines[lines.length - 2];
            if (typeof secondLastLine === 'undefined') {
                secondLastLine = 'Initialising...';
            }
            else if (secondLastLine.includes('[ffmpeg] Destination:')) {
                secondLastLine = 'Finishing up...';
            }

            else if (secondLastLine.includes('Deleting original file ')) {
                secondLastLine = 'Almost done...';
            }
            show_alert(secondLastLine, "info");
            console.log(secondLastLine);
            await sleep(500); // Using the sleep function defined above.
        } catch(error) {
            show_alert(error, 'danger');
            console.log(error);
        }
    }
}
  
// This function runs when one of the download buttons is clicked.
async function buttonClicked(whichButton) { // whichButton is this.value in yt.html
    if (linkBox.value == '') {
        show_alert('Trying to download something without pasting the URL? You silly billy.', 'warning')
        return;
    }
    const contentsOfLinkBox = linkBox.value;
    const regExp = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;

    if (contentsOfLinkBox.match(regExp)) {

        try {
            const firstFormData = new FormData();
            firstFormData.append('link', contentsOfLinkBox);
            firstFormData.append('button_clicked', 'yes');

            // First POST request to get the name of the progress file.
            response = await fetch('/yt', {
                method: 'POST',
                body: firstFormData
            });

            // Python will return the filename for the youtube-dl progress file, 
            // or an error message if the user enters a disallowed string.
            responseFromServer = await response.text();

            if (!response.ok) {
                show_alert(responseFromServer, 'danger');
            }
            else {
                // The FormData for the 2nd POST request.
                const data = new FormData();
                data.append("link", linkBox.value);
                data.append("button_clicked", whichButton);

                // Set shouldLog to true so the loop in showDownloadProgress keeps repeating.
                shouldLog = true;
                showDownloadProgress();
                
                try {
                    // 2nd POST request to get the download link.
                    const responseWithDownloadLink = await fetch("/yt", {
                        method: 'POST',
                        body: data
                    });
                    // As we're using await fetch, if we reach this line, it means that we've received a response,
                    // so the download has completed.
                    shouldLog = false; // Set shouldLog to false to end the while loop in showDownloadProgress.
                    downloadLink = await responseWithDownloadLink.text();
                    show_alert(`Your browser should have started downloading the file. If it hasn't, click \
                    <a href="${downloadLink}">here</a>.`, "success");
                    const createLink = document.createElement("a"); // Create a virtual link.
                    // when the link is visited. As we have set an empty value, it means use the original filename.
                    createLink.href = downloadLink; // Setting the URL of createLink to downloadLink
                    createLink.download = ''; // The download attribute specifies that the file will be downloaded
                    createLink.click();
                } 
                catch(error) { // 2nd POST request.
                    show_alert(error, 'danger');
                    console.log(error);
                }
            } // Closing bracket for the else block.
        } 
        catch(error) { // First POST request.
            show_alert(error, 'danger');
            console.log(error);
        }
    }
    else { // If the contents of the link box don't match the regex.
        show_alert(`Invalid URL provided.`, 'danger');
    }
}
import { createIPFSClient, uploadIPFS } from "../../scripts/ipfs.js";
import { getWallet } from "../../scripts/getWallet.js";
import { getTrustedProject } from "../../scripts/trustedProject.js";
import { CreatorSatisfiedEvent } from "./events.js";


function makeProgressDotActive(labelQuery) {
    const dotContainer = document.querySelector(labelQuery).parentElement;

    for (const element of dotContainer.children) {
        element.classList.add('active');
    }

    dotContainer.previousElementSibling.classList.add('active');
}


async function getUploadedFiles(trustedProject) {
    const uploadedFiles = document.querySelector(".uploadedFiles");
    const projectLinks = await trustedProject.getProjectLinks();
    const ipfs = await createIPFSClient();

    for (let file of projectLinks) {
        let ipfsHash;

        try {
            file = JSON.parse(file);
        } catch (error) { }

        if (file.type === "ipfs") {
            let content = await ipfs.cat(file.hash);

            const uploadedFile = new Blob([content], { type: "application/octet-stream" });
            const link = document.createElement('a');

            link.href = URL.createObjectURL(uploadedFile);
            link.innerText = `Download ${file.name}...`;
            link.download = file.name;

            uploadedFiles.appendChild(link);
        }

    }

}

async function updateTotalPayment(trustedProject) {
    const totalPayment = await trustedProject.getPayment();

    for (const element of document.querySelectorAll(".total_payment")) {
        element.innerHTML = `${ethers.formatEther(totalPayment)} ETH`;
    }

    if (totalPayment > 0) {
        makeProgressDotActive(".diagramWaitPayment");
    }

}

async function releasePayment(trustedProject) {
    const transaction = await trustedProject.completeProject();
    await transaction.wait();
}

async function updateProjectState(trustedProject) {
    await updateTotalPayment(trustedProject);
    const projectStateFilter = trustedProject.filters.ProjectStateChanged();

    trustedProject.queryFilter(projectStateFilter, 0, 'latest').then(events => {
        console.log(events)
    });

    trustedProject.on(projectStateFilter, (newState) => {
        console.log(newState)
    });

    window.dispatchEvent(new CreatorSatisfiedEvent());
}

function createCreatorPage(trustedProject) {

    document.querySelector(".diagramWaitPayment").innerText = "Wait for the payment";
    document.querySelector(".diagramUploadFiles").innerText = "Upload the project";
    document.querySelector(".diagramFileCheck").innerText = "Wait for the project check";
    document.querySelector(".diagramPaymentRelease").innerText = "The payment is released";

    document.querySelector(".uploadIPFS").addEventListener("click", () => {
        document.querySelector(".fileUpload").click();
    });

    document.querySelector(".fileUpload").addEventListener("change", async (event) => {
        const uploadedHashes = [];

        for (const file of event.target.files) {
            const uploadedHash = await uploadIPFS(file);
            uploadedHashes.push(JSON.stringify(uploadedHash));
        }

        const estimateGas = await trustedProject.uploadProject.estimateGas(uploadedHashes, true);
        const transaction = await trustedProject.uploadProject(uploadedHashes, true, { gasLimit: estimateGas });
        await transaction.wait();
    });

    document.querySelector("#uploadTypeSwitch").addEventListener('change', (event) => {
        const ipfsUpload = document.querySelector('.uploadIPFS');
        const linkInput = document.querySelector('.linkInput');

        if (event.target.checked) {
            ipfsUpload.style.display = 'none';
            linkInput.style.display = 'block';
        } else {
            ipfsUpload.style.display = 'block';
            linkInput.style.display = 'none';
        }
    });

    document.querySelector('#correctAmountCheckbox').addEventListener("change", (event) => {
        if (!event.target.checked) {
            return;
        }

        const creatorContainer = document.querySelector(".creatorContainer");
        creatorContainer.style.filter = "none";
        creatorContainer.style.pointerEvents = "auto";
        document.querySelector(".correctAmountContainer").parentElement.remove();
    });
}

function createCustomerPage(trustedProject) {
    document.querySelector(".diagramWaitPayment").innerText = "Make the payment";
    document.querySelector(".diagramUploadFiles").innerText = "Wait for the project";
    document.querySelector(".diagramFileCheck").innerText = "Check the files";
    document.querySelector(".diagramPaymentRelease").innerText = "Release the payment";

    document.querySelector(".addPayment").addEventListener("click", async () => {
        const paymentValue = document.querySelector("#paymentAmount").value;
        const transaction = await trustedProject.addPayment({ value: ethers.parseEther(paymentValue) });
        await transaction.wait();
    });

    document.querySelector(".releasePayment").addEventListener('click', async () => {
        await releasePayment(trustedProject);
    });

    document.addEventListener((new CreatorSatisfiedEvent()).type, async () => {
        document.querySelector("#customerPaymentRelease").style.display = "inherit";
        document.querySelector("#customerPaymentUpload").style.display = "none";
        await getUploadedFiles();
    });
}


document.addEventListener("DOMContentLoaded", async () => {
    const address = window.location.search.replace("?address=", "");

    if (!ethers.isAddress(address)) {
        window.location.search = "";
        window.location.pathname = `/`;
    }

    const signer = await getWallet();
    const trustedProject = getTrustedProject(address, signer);
    let customer;

    try {
        customer = await trustedProject.customer();
    } catch (error) {
        window.location.search = "";
        window.location.replace("/");
    }

    document.querySelector(".creatorAddress").innerText = `${(await trustedProject.creator()).slice(0, 9)}...`;
    document.querySelector(".customerAddress").innerText = `${(await trustedProject.customer()).slice(0, 9)}...`;

    document.querySelector('.share').addEventListener('click', async () => {
        if (navigator.share) {
            await navigator.share({
                title: 'I want to share a Trusted Project with you!',
                text: `You can easily pay me in Crypto using this Trusted Project. Address: ${address}`,
                url: window.location.href,
            });
        } else {
            alert("Please, update your browser. The functions that we are trying to use are not available.");
        }
    });

    if (customer.toLowerCase() === signer.address.toLowerCase()) {
        document.querySelector(".creatorMainContainer").remove();
        createCustomerPage(trustedProject);
    } else {
        document.querySelector(".customerContainer").remove();
        createCreatorPage(trustedProject);
    }

    updateProjectState(trustedProject);
});

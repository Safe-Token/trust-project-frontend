import { createIPFSClient, uploadIPFS } from "../../scripts/ipfs.js";
import { getWallet } from "../../scripts/getWallet.js";
import { getTrustedProject, getUser } from "../../scripts/trustedProject.js";
import { CreatorSatisfiedEvent } from "./events.js";


function makeProgressDotActive(labelQuery){
    const dotContainer = document.querySelector(labelQuery).parentElement;

    for(const element of dotContainer.children){
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

    if(totalPayment == 0){
        makeProgressDotActive(".diagramWaitPayment");
    }

}

async function releasePayment(trustedProject) {
    const transaction = await trustedProject.completeProject();
    await transaction.wait();
}

async function updateProjectState(trustedProject) {    
    await updateTotalPayment(trustedProject);

    const creator = getUser(await trustedProject.creator());
    const isCreatorSatisfied = await creator.isSatisfied();

    if (isCreatorSatisfied) {
        window.dispatchEvent(new CreatorSatisfiedEvent());
        await getUploadedFiles(trustedProject);
    }
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


function createCustomerPage(trustedProject){
    document.querySelector(".diagram_wait_payment").innerText = "Make the payment";
    document.querySelector(".diagram_upload_files").innerText = "Wait for the project";
    document.querySelector(".diagram_file_check").innerText = "Check the files";
    document.querySelector(".diagram_payment_release").innerText = "Release the payment";

    document.querySelector(".addPayment").addEventListener("click", async () => {
        const paymentValue = document.querySelector("#paymentAmount").value;
        const transaction = await trustedProject.addPayment({ value: ethers.parseEther(paymentValue) });
        await transaction.wait();
    });

    document.querySelector(".releasePayment").addEventListener('click', async () => {
        await releasePayment(trustedProject);
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

    const isCustomer = customer.toLowerCase() === signer.address.toLowerCase();
    setInterval(() => { updateProjectState(trustedProject); }, 3000);

    if (isCustomer) {
        createCustomerPage(trustedProject);
        document.querySelector(".creatorContainer").remove();
    } else {
        createCreatorPage(trustedProject);
        document.querySelector(".customerContainer").remove();
    }

    document.addEventListener((new CreatorSatisfiedEvent()).type, () => {
        document.querySelector("#customerPaymentRelease").style.display = "inherit";
        document.querySelector("#customerPaymentUpload").style.display = "none";
    });

});

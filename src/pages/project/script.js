import { createIPFSClient, uploadIPFS } from "../../scripts/ipfs.js";
import { getWallet } from "../../scripts/getWallet.js";
import { getTrustedProject, getUser } from "../../scripts/trustedProject.js";
import { CreatorSatisfiedEvent } from "./events.js";


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
}

async function releasePayment(trustedProject) {
    const transaction = await trustedProject.completeProject();
    await transaction.wait();
}

async function updateProjectState(trustedProject) {
    const creator = getUser(await trustedProject.creator());
    const isCreatorSatisfied = await creator.isSatisfied();
    console.log(isCreatorSatisfied);

    if (isCreatorSatisfied) {
        window.dispatchEvent(new CreatorSatisfiedEvent());
        await getUploadedFiles(trustedProject);
    }

    await updateTotalPayment(trustedProject);
}

function createCreatorPage(trustedProject) {
    document.querySelector(".uploadIPFS").addEventListener("click", () => {
        document.querySelector(".file_upload").click();
    });

    document.querySelector(".file_upload").addEventListener("change", async (event) => {
        const uploadedHashes = [];

        for (const file of event.target.files) {
            const uploadedHash = await uploadIPFS(file);
            uploadedHashes.push(JSON.stringify(uploadedHash));
        }

        const estimateGas = await trustedProject.uploadProject.estimateGas(uploadedHashes, true);
        const transaction = await trustedProject.uploadProject(uploadedHashes, true, { gasLimit: estimateGas });
        await transaction.wait();
    });

    document.querySelector("#upload_type_switch").addEventListener('change', (event) => {
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

    document.querySelector('#correct_amount_checkbox').addEventListener("change", (event) => {
        if (!event.target.checked) {
            return;
        }

        const creatorContainer = document.querySelector(".creatorContainer");
        creatorContainer.style.filter = "none";
        creatorContainer.style.pointerEvents = "auto";
        document.querySelector(".correct_amount_container").parentElement.remove();
    });
}


function createCustomerPage(trustedProject){
    document.querySelector(".add_payment").addEventListener("click", async () => {
        const paymentValue = document.querySelector("#payment_amount").value;
        const transaction = await trustedProject.addPayment({ value: ethers.parseEther(paymentValue) });
        await transaction.wait();
        await updateTotalPayment();
    });

    document.querySelector(".release_payment").addEventListener('click', async () => {
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

    if (isCustomer) {
        createCustomerPage(trustedProject);
        document.querySelector(".creatorContainer").style.display = "none";
    } else {
        createCreatorPage(trustedProject);
        document.querySelector(".customerContainer").style.display = "none";
    }

    setInterval(3000, () => { updateProjectState(trustedProject); });

    document.addEventListener((new CreatorSatisfiedEvent()).type, () => {
        document.querySelector("#customerPaymentRelease").style.display = "inherit";
        document.querySelector("#customerPaymentUpload").style.display = "none";
    });

});

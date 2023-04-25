import TrustedProjectData from "../../abis/TrustedProject.json" assert { type: "json" };


let client = null;

async function createIPFSClient() {
    if (client !== null) {
        return client;
    }

    client = Ipfs.create({ host: 'https://ipfs.infura.io', port: 5001, protocol: 'https' });
    return client;
}


async function uploadIPFS(file) {
    const ipfs = await createIPFSClient();
    const result = await ipfs.add(file, { pin: true });
    return result.path;
}


async function getUploadedFiles(trustedProject) {
    const uploadedFiles = document.querySelector(".uploadedFiles");
    const projectLinks = await trustedProject.getProjectLinks();
    const ipfs = await createIPFSClient();

    for (const file of projectLinks) {
        let content = [];

        for await (const chunk of ipfs.cat(file)) {
            content += chunk;
        }

        content = Uint8Array.from(content);
        const uploadedFile = new Blob([content], { type: 'application/octet-stream' });
        const link = document.createElement('a');

        link.href = URL.createObjectURL(uploadedFile);
        link.innerText = `Download ${file.slice(5)}...`;
        link.download = file;

        uploadedFiles.appendChild(link);
    }

}


document.addEventListener("DOMContentLoaded", async () => {
    const address = window.location.search.replace("?address=", "");

    if (!ethers.isAddress(address)) {
        window.location.search = "";
        window.location.pathname = `/`;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();

    const trustedProject = new ethers.Contract(address, TrustedProjectData.abi, signer);
    let customer;

    try {
        customer = await trustedProject.customer();
    } catch (error) {
        window.location.search = "";
        window.location.replace("/");
    }

    const isCustomer = customer.toLowerCase() === signer.address.toLowerCase();
    await getUploadedFiles(trustedProject);

    async function updateTotalPayment() {
        const totalPayment = await trustedProject.getPayment();
        for (const element of document.querySelectorAll(".total_payment")) {
            element.innerHTML = `${ethers.formatEther(totalPayment)} ETH`;
        }
    }

    updateTotalPayment();

    document.querySelector(".add_payment").addEventListener("click", async () => {
        const paymentValue = document.querySelector("#payment_amount").value;
        const transaction = await trustedProject.addPayment({ value: ethers.parseEther(paymentValue) });
        await transaction.wait();
        await updateTotalPayment();
    });

    document.querySelector(".uploadIPFS").addEventListener("click", () => {
        document.querySelector(".file_upload").click();
    });

    document.querySelector(".file_upload").addEventListener("change", async (event) => {
        const uploadedHashes = [];

        for (const file of event.target.files) {
            const uploadedHash = await uploadIPFS(file);
            uploadedHashes.push(uploadedHash);
        }

        const transaction = await trustedProject.uploadProject(uploadedHashes, true);
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

        const creatorContainer = document.querySelector(".creator_container");
        creatorContainer.style.filter = "none";
        creatorContainer.style.pointerEvents = "auto";
        document.querySelector(".correct_amount_container").parentElement.remove();
    });

});

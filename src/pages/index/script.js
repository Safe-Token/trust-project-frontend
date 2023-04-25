import TrustedProjectData from "../../abis/TrustedProject.json" assert { type: "json" };


document.addEventListener("DOMContentLoaded", () => {
    const addressInputs = document.getElementsByClassName("address_input");

    for (const input of addressInputs) {
        input.addEventListener("change", () => {
            const errorLabel = input.parentNode.querySelector('.mdl-textfield__error');

            if (!input.value || ethers.isAddress(input.value)) {
                errorLabel.classList.remove('visible');
                errorLabel.style.display = 'none';
            } else {
                errorLabel.classList.add('visible');
                errorLabel.style.display = 'inline-block';
            }
        });
    }

    const createButton = document.getElementsByClassName("create_button")[0];

    createButton.addEventListener("click", async (event) => {
        event.preventDefault();

        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);

        const factory = new ethers.ContractFactory(
            TrustedProjectData.abi,
            TrustedProjectData.bytecode,
            await provider.getSigner(),
        );

        const customerAddress = document.getElementById("customer-address").value;
        const creatorAddress = document.getElementById("creator-address").value;

        if (!ethers.isAddress(customerAddress) || !ethers.isAddress(creatorAddress)) {
            return;
        }

        try{
            const trustedProject = await factory.deploy(customerAddress, creatorAddress);
            const transaction = trustedProject.deploymentTransaction();
            await transaction.wait();

            window.location.href = `/project/?address=${trustedProject.target}`;
        }catch(error){
            alert(error);
        }
    });

    const switchElement = document.getElementById("user_type_switch");

    switchElement.addEventListener("change", () => {
        const customerAddressInput = document.getElementById("customer-address").parentElement;
        const creatorAddressInput = document.getElementById("creator-address").parentElement;

        const mainInput = switchElement.checked ? creatorAddressInput : customerAddressInput;
        const otherInput = switchElement.checked ? customerAddressInput : creatorAddressInput;
        const inputContainer = mainInput.parentElement;

        otherInput.parentElement.prepend(mainInput.cloneNode(true));
        otherInput.parentElement.removeChild(otherInput);

        inputContainer.appendChild(otherInput);
        mainInput.remove();
    });

    async function createWallet(){
        if(!window.ethereum){
            return;
        }

        const element = document.querySelector(".current_wallet_address");
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();

        if(element.walletConnected){
            document.querySelector(".main_input_container input").value = signer.address;
        } else {
            element.innerText = `${signer.address.slice(0, 9)}...`;
            element.walletConnected = true;
        }
    }

    document.querySelector(".current_wallet_address").addEventListener("click", (event) => {
        event.preventDefault();
        createWallet();
    });

    createWallet();
});

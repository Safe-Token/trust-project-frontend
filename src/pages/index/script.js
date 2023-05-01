import TrustedProjectData from "../../abis/TrustedProject.json" assert { type: "json" };
import { getWallet } from "../../scripts/getWallet.js";

function deleteArbitrage(event) {
    event.preventDefault();
    event.target.parentElement.remove();
}


function checkAddressInput(event){
    const errorLabel = event.target.parentNode.querySelector('.mdl-textfield__error');

    if (!event.target.value || ethers.isAddress(event.target.value)) {
        errorLabel.classList.remove('visible');
        errorLabel.style.display = 'none';
    } else {
        errorLabel.classList.add('visible');
        errorLabel.style.display = 'inline-block';
    }
}


function createArbitrage() {
    const arbitrageInputRow = document.createElement("div");
    arbitrageInputRow.classList.add("arbitrageInputRow");

    const inputContainer = document.createElement('div');
    inputContainer.classList.add('mdl-textfield', 'mdl-js-textfield', 'mdl-textfield--floating-label', 'customer_input', 'arbitrageAddress');

    const input = document.createElement('input');
    input.classList.add('mdl-textfield__input', 'address_input', "arbitrage_address");
    input.type = 'text';
    input.name = `arbitrageInput${document.querySelectorAll('.arbitrageInputRow').length}`;
    input.id = input.name;
    input.addEventListener('change', checkAddressInput);

    const span = document.createElement('span');
    span.classList.add('mdl-textfield__error');
    span.textContent = 'Invalid address format.';

    const link = document.createElement('a');
    link.href = 'https://support.metamask.io/hc/en-us/articles/360015488791-How-to-view-your-account-details-and-public-address';
    link.target = '_blank';
    link.textContent = 'Try reading this';
    span.appendChild(link);

    const label = document.createElement('label');
    label.classList.add('mdl-textfield__label');
    label.htmlFor = input.name;
    label.textContent = 'Wallet address';

    inputContainer.appendChild(input);
    inputContainer.appendChild(span);
    inputContainer.appendChild(label);

    const deleteIcon = document.createElement('span');
    deleteIcon.classList.add('material-icons', 'deleteArbitrage');
    deleteIcon.textContent = 'delete';
    deleteIcon.addEventListener('click', deleteArbitrage);

    arbitrageInputRow.appendChild(inputContainer);
    arbitrageInputRow.appendChild(deleteIcon);
    return arbitrageInputRow;
}


document.addEventListener("DOMContentLoaded", () => {
    const addressInputs = document.getElementsByClassName("address_input");

    for (const input of addressInputs) {
        input.addEventListener("change", checkAddressInput);
    }

    const createButton = document.getElementsByClassName("create_button")[0];

    createButton.addEventListener("click", async (event) => {
        event.preventDefault();

        const signer = await getWallet();
        const factory = new ethers.ContractFactory(TrustedProjectData.abi, TrustedProjectData.bytecode, signer);

        const customerAddress = document.querySelector("#customer-address").value;
        const creatorAddress = document.querySelector("#creator-address").value;
        const arbitrageAddresses = Array.from(
            document.querySelectorAll(".arbitrage_address")).map(element => element.value).filter(element => element);

        if(arbitrageAddresses.length === 0){
            alert("You have no arbitrage wallets! No one will be able to settle a dispute!");
            return;
        } else if (!ethers.isAddress(customerAddress) || !ethers.isAddress(creatorAddress)) {
            alert("One of the addresses is incorrect! Please, try again.");
            return;
        } else if (customerAddress.toLowerCase() === creatorAddress.toLowerCase()) {
            alert("Addresses are equal! Please, take a look at our manual.");
            return;
        }else if(arbitrageAddresses.includes(customerAddress)){
            alert("Customer cannot be an arbitrage! Please, take a look at our manual.");
            return;
        }else if(arbitrageAddresses.includes(creatorAddress)){
            alert("Creator cannot be an arbitrage! Please, take a look at our manual.");
            return;
        }

        try {
            const trustedProject = await factory.deploy(
                customerAddress,
                creatorAddress,
                arbitrageAddresses,
            );
            const transaction = trustedProject.deploymentTransaction();
            await transaction.wait();

            window.location.href = `/project/?address=${trustedProject.target}`;
        } catch (error) {
            console.log(error);
            alert("An error happened. Please, report it here: https://github.com/Safe-Token/trust-project");
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

    async function createWallet() {
        if (!window.ethereum) {
            return;
        }

        const element = document.querySelector(".current_wallet_address");
        const signer = await getWallet();

        if (element.walletConnected) {
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

    document.querySelector(".additional_parameters_button").addEventListener("click", (event) => {
        event.preventDefault();
        const isAdded = document.querySelector(".additional_parameters").classList.toggle("additional_visible");
        document.querySelector('.additional_parameters_icon').innerText = isAdded ? "remove" : "add";
    });

    for (const deleteButton of document.querySelectorAll(".deleteArbitrage")) {
        deleteButton.addEventListener('click', deleteArbitrage);
    }

    document.querySelector(".add_arbitrage_button").addEventListener('click', (event) => {
        const arbitrageContainer = event.target.parentElement;
        arbitrageContainer.insertBefore(createArbitrage(), event.target);
    });

    const arbitrageElement = createArbitrage();
    arbitrageElement.querySelector("input").value = '0x20d4dc11d594ecf346021ba4c4b9a7fd0b26c7a9';  // creator's address. Will be removed once the project is popular
    arbitrageElement.querySelector("label").innerText = 'Trusted Project wallet';

    document.querySelector(".additional_parameters").insertBefore(arbitrageElement, document.querySelector(".add_arbitrage_button"));

    createWallet();
});

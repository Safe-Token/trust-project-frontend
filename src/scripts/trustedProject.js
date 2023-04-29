import TrustedProjectData from "../../abis/TrustedProject.json" assert { type: "json" };
import UserData from "../../abis/User.json" assert { type: "json" };


export function getTrustedProject(address, signer){
    return new ethers.Contract(address, TrustedProjectData.abi, signer);
}


export function getUser(address, signer){
    return new ethers.Contract(address, UserData.abi, signer);
}

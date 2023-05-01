import TrustedProjectData from "../../abis/TrustedProject.json" assert { type: "json" };

export function getTrustedProject(address, signer){
    return new ethers.Contract(address, TrustedProjectData.abi, signer);
}

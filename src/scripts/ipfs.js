let client = null;

export async function createIPFSClient() {
    if (client !== null) {
        return client;
    }

    client = Ipfs.create({ host: 'https://ipfs.infura.io', port: 5001, protocol: 'https' });
    return client;
}


export async function uploadIPFS(file) {
    const ipfs = await createIPFSClient();
    const result = await ipfs.add(file, { pin: true });
    return { hash: result.path, type: 'ipfs', name: file.name };
}

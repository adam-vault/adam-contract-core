const { get } = hre.deployments;

async function getDaoInfo() {
    const adamDeployment = await get('Adam');
    const adam = await hre.ethers.getContractAt('Adam', adamDeployment.address);
    const events = await adam.queryFilter(adam.filters.CreateDao());
    const daos = await events.reduce(async (daosPromise, e) => {
        const daos = await daosPromise;
        const dao = await hre.ethers.getContractAt('Dao', e.args.dao);
        const name = await dao.name();
        daos.push({
            dao: e.args.dao,
            name,
        });
        return daos;
    }, []);

    return daos;
}

module.exports = getDaoInfo;

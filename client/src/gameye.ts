import { PlayFabClient } from "playfab-sdk";

export async function createMatchOnGameye(
    matchKey: string,
    gameKey: string,
    locationKeys: string[],
    templateKey: string,
    config: {
        [key: string]: any,
    },
) {
    const result = await new Promise(resolve => PlayFabClient.ExecuteCloudScript({
        FunctionName: "startGameyeServer",
        FunctionParameter: { matchKey, gameKey, locationKeys, templateKey, config },
        GeneratePlayStreamEvent: true,
    }, (_: any, res: any) => resolve(res.data))) as any;
    return result;
}

export async function pollForGameyeServer(matchKey: string) {
    let i = 0;
    while (i++ < 10) {
        const result = await new Promise(resolve => PlayFabClient.ExecuteCloudScript({
            FunctionName: "getServerInfo",
            FunctionParameter: { matchKey },
            GeneratePlayStreamEvent: true,
        }, (_: any, res: any) => resolve(res.data))) as any;

        if (!!result.FunctionResult.server) {
            return result.FunctionResult.server;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

export function convertRegionsToLocations(regions: string[]) {
    for (const iterator of regions) {
        switch (iterator) {
            case "NorthEurope":
                return ["stockholm"];

            case "WestEurope":
                return ["frankfurt", "amsterdam", "london"];

            case "AustraliaEast":
            case "AustraliaSoutheast":
            case "SoutheastAsia":
                return ["singapore"];

            case "BrazilSouth":
                return ["sao_paulo"];

            case "NorthCentralUs":
            case "CentralUs":
            case "SouthCentralUs":
                return ["dallas"];

            case "ChinaEast2":
            case "ChinaNorth2":
            case "EastAsia":
            case "JapanEast":
            case "JapanWest":
                return ["hong_kong"];

            case "EastUs":
            case "EastUs2":
                return ["washington_dc"];

            case "SouthAfricaNorth":
                return ["madrid"];

            case "WestUs":
                return ["san_jose"];
        }
    }

    return ["frankfurt"];
}

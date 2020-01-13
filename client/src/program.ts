import { PlayFab, PlayFabAdmin, PlayFabClient, PlayFabGroups } from "playfab-sdk";

import { createMatchmakingTicket } from "./createMatchmakingTicket";
import { createMatchOnGameye, pollForGameyeServer } from "./gameye";
import { getMatch } from "./getMatch";
import { getPlayerLatencies } from "./getPlayerLatencies";
import { login } from "./login";
import { pollForGroupData } from "./pollForGroupData";
import { pollForMatch } from "./pollForMatch";
import { Profiler } from "./profiler";

PlayFabClient.settings.developerSecretKey = process.env.PLAYFAB_SECRET;
PlayFab.settings.developerSecretKey = process.env.PLAYFAB_SECRET;

main();

async function main() {
    const profiler = new Profiler();

    const playerId = process.argv[2] || 0;

    const { EntityToken } = await login(playerId);
    profiler.measureSinceLast("Login");

    const latencies = await getPlayerLatencies();

    // Playfab doesn't like empty latency arrays, will fail to create a ticket, so rather send nothing
    const { TicketId } = await createMatchmakingTicket(EntityToken, latencies.length > 0 ? latencies : undefined);
    profiler.measureSinceLast("Created ticket");

    const { MatchId, CancellationReasonString } = await pollForMatch(TicketId);
    profiler.measureSinceLast("Tickets Matched");

    if (!!MatchId) {
        // tslint:disable-next-line: no-console
        console.log(`Got match: ${MatchId}`);

        // TODO: If latencies are provided, the response to this contains a RegionPreferences array
        await getMatch(MatchId);
        profiler.measureSinceLast("Got Match");

        const creator = await pollForGroupData(MatchId, "Creator");
        profiler.measureSinceLast("Got Creator");

        // If this client should create the server
        // Note: We wouldn't need to do this in Azure, or if cloudscript allowed for a longer timeout on events
        if (creator === TicketId) {
            await createMatchOnGameye(MatchId, "csgo-dem", ["frankfurt"], "bots", { maxRounds: 2 });
            profiler.measureSinceLast("Started Gameye Server");
        }

        const server = await pollForGameyeServer(MatchId);

        // tslint:disable-next-line: no-console
        console.log(`Got server for ${MatchId}, client should connect to: ${JSON.stringify(server.host)}`);

        profiler.measureSinceLast("Got Gameye Server");
        profiler.measureSinceStart("Finished");
    } else {
        // tslint:disable-next-line: no-console
        console.error(`Failed to create a match: ${CancellationReasonString}`);
    }
}

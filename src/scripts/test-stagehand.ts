import { Stagehand } from '@browserbasehq/stagehand';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
    console.log("Initializing Stagehand with model gpt-5-mini...");

    const stagehand = new Stagehand({
        env: "LOCAL",
        // @ts-ignore
        modelName: "gpt-5-mini",
        modelClientOptions: {
            apiKey: process.env.OPENAI_API_KEY,
        }
    });

    await stagehand.init();
    console.log("Stagehand initialized.");

    let page;
    try {
        // Attempt to get page
        // @ts-ignore
        page = stagehand.page;

        // @ts-ignore
        if (!page && stagehand.context) {
            // @ts-ignore
            if (stagehand.context.pagesByTarget) {
                console.log("Searching for page in pagesByTarget...");
                // @ts-ignore
                const targets = stagehand.context.pagesByTarget;
                let keys = [];
                if (targets instanceof Map) {
                    keys = Array.from(targets.keys());
                    if (keys.length > 0) page = targets.get(keys[0]);
                } else {
                    keys = Object.keys(targets);
                    if (keys.length > 0) page = targets[keys[0]];
                }

                if (page) console.log("Found page in pagesByTarget.");
            }
        }

        if (!page) {
            throw new Error("Could not find page object on stagehand instance or context");
        }

        await page.goto("https://example.com");
        console.log("Navigated to example.com");

        // @ts-ignore
        const extraction = await stagehand.extract({
            instruction: "Extract the title and the main paragraph of the page.",
            schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    content: { type: "string" }
                },
                required: ["title", "content"]
            }
        });

        console.log("Extraction Result:", extraction);
    } catch (error) {
        console.error("An error occurred during Stagehand execution:", error);
    } finally {
        await stagehand.close();
        console.log("Stagehand closed.");
    }
}

main().catch(console.error);

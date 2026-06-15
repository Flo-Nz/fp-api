/**
 * Batch-fetch BGG covers for all games without one.
 * Processes 100 games per batch, waits 60s between batches.
 * Within each batch, waits 500ms between requests (well under BGG's 5s limit
 * since we have a token — adjust if you get 429s).
 *
 * Usage: node src/scripts/fetchAllCovers.js
 */

import dotenv from 'dotenv';
dotenv.config({ override: true });

import mongoose from 'mongoose';
import { Orop } from '../models/Orop.js';
import { fetchBggCover } from '../services/bggClient.js';

const BATCH_SIZE = 50;
const DELAY_BETWEEN_REQUESTS_MS = 5500; // 5.5s — BGG recommends minimum 5s
const DELAY_BETWEEN_BATCHES_MS = 30000; // 30s between batches

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const totalMissing = await Orop.countDocuments({
        $or: [{ coverUrl: { $exists: false } }, { coverUrl: null }],
    });
    console.log(`Total games without covers: ${totalMissing}\n`);

    let processed = 0;
    let success = 0;
    let notFound = 0;
    let errors = 0;
    let batchNum = 0;

    while (true) {
        const games = await Orop.find(
            { $or: [{ coverUrl: { $exists: false } }, { coverUrl: null }] },
            { title: 1 }
        )
            .limit(BATCH_SIZE)
            .lean();

        if (games.length === 0) {
            console.log('\nNo more games to process!');
            break;
        }

        batchNum++;
        console.log(`\n--- Batch ${batchNum} (${games.length} games) ---`);

        for (const game of games) {
            processed++;
            const title = game.title?.[0];
            const progress = `[${processed}/${totalMissing}]`;

            if (!title) {
                console.log(`${progress} SKIP — no title`);
                continue;
            }

            try {
                let bggData = null;
                for (const t of game.title) {
                    bggData = await fetchBggCover(t);
                    if (bggData) break;
                    // If we tried a title and got nothing, wait before next title
                    await sleep(DELAY_BETWEEN_REQUESTS_MS);
                }

                if (bggData) {
                    await Orop.findByIdAndUpdate(game._id, {
                        $set: {
                            bggId: bggData.bggId,
                            coverUrl: bggData.coverUrl,
                            thumbnailUrl: bggData.thumbnailUrl,
                        },
                    });
                    success++;
                    console.log(`${progress} ✓ ${title}`);
                } else {
                    // Mark as attempted so we don't retry forever
                    await Orop.findByIdAndUpdate(game._id, {
                        $set: { coverUrl: '' },
                    });
                    notFound++;
                    console.log(`${progress} ✗ ${title} — not found`);
                }
            } catch (err) {
                // If 429, wait longer and retry this game
                if (err.message?.includes('429')) {
                    console.log(`${progress} ⏳ ${title} — rate limited, waiting 30s...`);
                    await sleep(30000);
                    // Don't count as error, will be retried in next batch
                    continue;
                }
                errors++;
                console.log(`${progress} ⚠ ${title} — ${err.message}`);
            }

            await sleep(DELAY_BETWEEN_REQUESTS_MS);
        }

        console.log(`\nBatch ${batchNum} done. Waiting 60s...`);
        console.log(`  Running total: ✓${success} ✗${notFound} ⚠${errors}`);
        await sleep(DELAY_BETWEEN_BATCHES_MS);
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`  ✓ ${success} covers fetched`);
    console.log(`  ✗ ${notFound} not found on BGG`);
    console.log(`  ⚠ ${errors} errors`);
    console.log(`  Total processed: ${processed}`);

    await mongoose.disconnect();
};

run().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});

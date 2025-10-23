// Test script to check if comments are being saved in COPUS observations
require('dotenv').config();
const mongoose = require('mongoose');
const CopusObservation = require('./model/copusObservation');
const CopusResult = require('./model/copusResult');

async function testCommentRetrieval() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all COPUS observations
        const observations = await CopusObservation.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        console.log(`📊 Found ${observations.length} COPUS observations (showing last 5):\n`);

        observations.forEach((obs, index) => {
            console.log(`========== Observation ${index + 1} ==========`);
            console.log(`ID: ${obs._id}`);
            console.log(`Created: ${obs.createdAt}`);
            console.log(`COPUS Type: ${obs.copusNumber}`);
            console.log(`Overall Comments: ${obs.overallComments || 'NONE'}`);
            console.log(`\nInterval-by-interval comments:`);
            
            if (obs.observations && obs.observations.length > 0) {
                obs.observations.forEach((interval, idx) => {
                    if (interval.comment && interval.comment.trim()) {
                        console.log(`  Interval ${interval.intervalNumber}: "${interval.comment}"`);
                    }
                });
                
                const commentsCount = obs.observations.filter(i => i.comment && i.comment.trim()).length;
                console.log(`\nTotal intervals with comments: ${commentsCount} out of ${obs.observations.length}`);
            } else {
                console.log('  No interval observations found');
            }
            console.log('\n');
        });

        // Also check if CopusResults have comments
        console.log('\n📋 Checking CopusResults for comment fields...\n');
        const results = await CopusResult.find({})
            .sort({ createdAt: -1 })
            .limit(3)
            .lean();

        results.forEach((result, index) => {
            console.log(`========== Result ${index + 1} ==========`);
            console.log(`ID: ${result._id}`);
            console.log(`Faculty: ${result.faculty_name}`);
            console.log(`Date: ${new Date(result.observation_date).toLocaleDateString()}`);
            console.log(`Additional Comments: ${result.additional_comments || 'NONE'}`);
            console.log(`Strengths: ${result.strengths || 'NONE'}`);
            console.log(`Areas for Improvement: ${result.areas_for_improvement || 'NONE'}`);
            console.log(`Recommendations: ${result.recommendations || 'NONE'}`);
            console.log('\n');
        });

        console.log('✅ Comment retrieval test complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testCommentRetrieval();

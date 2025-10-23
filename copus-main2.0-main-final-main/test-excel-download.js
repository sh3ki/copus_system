// Test script to verify Excel download functionality
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const CopusResult = require('./model/copusResult');
const CopusObservation = require('./model/copusObservation');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function testExcelGeneration() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find a COPUS result with data (the one with 10% and 9%)
        const copusResult = await CopusResult.findOne({
            faculty_name: 'Leo Garcia',
            student_action_percentage: { $gt: 0 }
        }).lean();

        if (!copusResult) {
            console.log('❌ No COPUS result found with data');
            process.exit(1);
        }

        console.log('📊 Found COPUS Result:');
        console.log(`   ID: ${copusResult._id}`);
        console.log(`   Faculty: ${copusResult.faculty_name}`);
        console.log(`   Teacher %: ${copusResult.teacher_action_percentage}%`);
        console.log(`   Student %: ${copusResult.student_action_percentage}%`);
        console.log(`   Schedule ID: ${copusResult.schedule_id}\n`);

        // Fetch the related COPUS observation data
        const copusObservation = await CopusObservation.findOne({
            scheduleId: copusResult.schedule_id
        }).lean();

        if (!copusObservation) {
            console.log('❌ COPUS observation data not found');
            process.exit(1);
        }

        console.log('📋 Found COPUS Observation:');
        console.log(`   ID: ${copusObservation._id}`);
        console.log(`   Intervals: ${copusObservation.observations.length}`);
        console.log(`   COPUS Type: ${copusObservation.copusNumber}\n`);

        console.log('📝 Generating Excel file...\n');

        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('COPUS Observation');

        // Set column widths
        worksheet.columns = [
            { key: 'min', width: 8 },
            { key: 'L', width: 6 }, { key: 'Ind', width: 6 }, { key: 'Grp', width: 6 },
            { key: 'AnQ', width: 6 }, { key: 'AsQ', width: 6 }, { key: 'WC', width: 6 },
            { key: 'SP', width: 6 }, { key: 'TQ', width: 6 }, { key: 'W_student', width: 6 },
            { key: 'O_student', width: 6 },
            { key: 'Lec', width: 6 }, { key: 'RtW', width: 6 }, { key: 'MG', width: 6 },
            { key: 'AnQ_teacher', width: 6 }, { key: 'PQ', width: 6 }, { key: 'FUp', width: 6 },
            { key: '1o1', width: 6 }, { key: 'DV', width: 6 }, { key: 'Adm', width: 6 },
            { key: 'W_teacher', width: 6 }, { key: 'O_teacher', width: 6 },
            { key: 'High', width: 7 }, { key: 'Med', width: 7 }, { key: 'Low', width: 7 },
            { key: 'Comments', width: 30 }
        ];

        // Title Section
        worksheet.mergeCells('A1:Z1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'COPUS DETAILS';
        titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5597' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 25;

        // Details Section
        const details = [
            ['Fullname:', copusResult.faculty_name, '', 'Semester:', copusResult.semester],
            ['Department:', copusResult.faculty_department, '', 'Subject Name:', copusResult.subject_name],
            ['Date:', new Date(copusResult.observation_date).toLocaleDateString(), '', 'Subject Type:', 'Lecture'],
            ['Start Time:', copusResult.start_time, '', 'Room:', copusResult.room],
            ['End Time:', copusResult.end_time, '', 'Observer:', copusResult.observer_name],
            ['Year / Grade Level:', copusResult.year, '', 'Copus Type:', copusResult.copus_type]
        ];

        let currentRow = 2;
        details.forEach((detail) => {
            const row = worksheet.getRow(currentRow);
            row.values = ['', ...detail];
            worksheet.getCell(currentRow, 2).font = { bold: true };
            worksheet.getCell(currentRow, 5).font = { bold: true };
            currentRow++;
        });

        console.log('✅ Added COPUS details section');

        // Add instructions
        currentRow++;
        worksheet.mergeCells(`A${currentRow}:Z${currentRow}`);
        const instructionsCell = worksheet.getCell(`A${currentRow}`);
        instructionsCell.value = "Instructions: For each 2-minute interval, check columns to show what's happening in each category. Check multiple columns where appropriate.";
        instructionsCell.font = { italic: true, size: 10 };
        instructionsCell.alignment = { wrapText: true };
        worksheet.getRow(currentRow).height = 30;
        currentRow++;

        // Header Row 1 (Categories)
        currentRow++;
        const headerRow1 = worksheet.getRow(currentRow);
        headerRow1.values = ['Min', 'Student Actions', '', '', '', '', '', '', '', '', '',
            'Teacher Actions', '', '', '', '', '', '', '', '', '', '',
            'Level of Engagement', '', '', 'Comments'];
        
        worksheet.mergeCells(currentRow, 2, currentRow, 11);
        worksheet.mergeCells(currentRow, 12, currentRow, 22);
        worksheet.mergeCells(currentRow, 23, currentRow, 25);

        for (let col = 1; col <= 26; col++) {
            const cell = worksheet.getCell(currentRow, col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5597' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
        }
        headerRow1.height = 20;

        console.log('✅ Added header row 1');

        // Header Row 2 (Sub-categories)
        currentRow++;
        const headerRow2 = worksheet.getRow(currentRow);
        headerRow2.values = ['', 'L', 'Ind', 'Grp', 'AnQ', 'AsQ', 'WC', 'SP', 'T/Q', 'W', 'O',
            'Lec', 'RtW', 'MG', 'AnQ', 'PQ', 'FUp', '1o1', 'D/V', 'Adm', 'W', 'O',
            'High', 'Med', 'Low', ''];

        for (let col = 1; col <= 26; col++) {
            const cell = worksheet.getCell(currentRow, col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5597' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
        }
        headerRow2.height = 20;
        currentRow++;

        console.log('✅ Added header row 2');

        // Data Rows (45 intervals)
        const observations = copusObservation.observations || [];
        let checkmarksCount = 0;
        let commentsCount = 0;

        for (let i = 0; i < 45; i++) {
            const interval = observations[i] || {};
            const studentActions = interval.studentActions || {};
            const teacherActions = interval.teacherActions || {};
            const engagement = interval.engagementLevel || { High: 0, Med: 0, Low: 0 };
            const comment = interval.comment || '';

            if (comment) commentsCount++;

            const rowData = [
                `${i * 2}-${i * 2 + 2}`,
                studentActions.L ? '✓' : '',
                studentActions.Ind ? '✓' : '',
                studentActions.Grp ? '✓' : '',
                studentActions.AnQ ? '✓' : '',
                studentActions.AsQ ? '✓' : '',
                studentActions.WC ? '✓' : '',
                studentActions.SP ? '✓' : '',
                studentActions.TQ ? '✓' : '',
                studentActions.W ? '✓' : '',
                studentActions.O ? '✓' : '',
                teacherActions.Lec ? '✓' : '',
                teacherActions.RtW ? '✓' : '',
                teacherActions.MG ? '✓' : '',
                teacherActions.AnQ ? '✓' : '',
                teacherActions.PQ ? '✓' : '',
                teacherActions.FUp ? '✓' : '',
                teacherActions['1o1'] ? '✓' : '',
                teacherActions.DV ? '✓' : '',
                teacherActions.Adm ? '✓' : '',
                teacherActions.W ? '✓' : '',
                teacherActions.O ? '✓' : '',
                engagement.High ? '✓' : '',
                engagement.Med ? '✓' : '',
                engagement.Low ? '✓' : '',
                comment
            ];

            checkmarksCount += rowData.filter(cell => cell === '✓').length;

            const dataRow = worksheet.getRow(currentRow);
            dataRow.values = rowData;

            for (let col = 1; col <= 26; col++) {
                const cell = worksheet.getCell(currentRow, col);
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                
                if (i % 2 === 0) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
                }
            }
            worksheet.getCell(currentRow, 26).alignment = { vertical: 'middle', horizontal: 'left' };
            
            currentRow++;
        }

        console.log(`✅ Added 45 data rows with ${checkmarksCount} checkmarks and ${commentsCount} comments`);

        // Summary Section
        currentRow++;
        worksheet.mergeCells(`A${currentRow}:Z${currentRow}`);
        const summaryCell = worksheet.getCell(`A${currentRow}`);
        summaryCell.value = 'COPUS RESULTS SUMMARY';
        summaryCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        summaryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5597' } };
        summaryCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(currentRow).height = 25;
        currentRow++;

        const summary = [
            ['Student Action %:', `${copusResult.student_action_percentage || 0}%`],
            ['Teacher Action %:', `${copusResult.teacher_action_percentage || 0}%`],
            ['Engagement %:', `${copusResult.engagement_level_percentage || 0}%`],
            ['Overall %:', `${copusResult.calculated_overall_percentage || 0}%`],
            ['Final Rating:', copusResult.final_rating || 'N/A'],
            ['Status:', copusResult.status || 'submitted']
        ];

        summary.forEach((item) => {
            const row = worksheet.getRow(currentRow);
            row.values = ['', item[0], item[1]];
            worksheet.getCell(currentRow, 2).font = { bold: true };
            currentRow++;
        });

        console.log('✅ Added summary section');

        // Footer
        currentRow++;
        worksheet.mergeCells(`A${currentRow}:Z${currentRow}`);
        const footerCell = worksheet.getCell(`A${currentRow}`);
        footerCell.value = `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} - COPUS (Classroom Observation Protocol for Undergraduate STEM)`;
        footerCell.font = { size: 9, italic: true };
        footerCell.alignment = { horizontal: 'center' };

        console.log('✅ Added footer\n');

        // Save to file
        const filename = `TEST_COPUS_${copusResult.faculty_name.replace(/\s+/g, '_')}_${new Date(copusResult.observation_date).toISOString().split('T')[0]}.xlsx`;
        const filepath = path.join(__dirname, filename);
        
        await workbook.xlsx.writeFile(filepath);
        
        console.log('✅ Excel file generated successfully!');
        console.log(`📁 File saved to: ${filepath}`);
        console.log(`📊 File size: ${fs.statSync(filepath).size} bytes\n`);

        console.log('🎉 TEST PASSED! Excel generation is working correctly!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ ERROR:', error);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    }
}

testExcelGeneration();

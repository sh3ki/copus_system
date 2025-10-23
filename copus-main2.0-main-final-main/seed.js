// seed.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Employee = require('./model/employee'); // adjust path if different

// Sample data - 5 accounts, one for each role
// Using password 'password123' for all accounts
const seedEmployees = [
  {
      employeeId: 'EMP001',
      department: 'IT Department',
      lastname: 'Santos',
      firstname: 'Juan',
      middleInitial: 'A',
      role: 'super_admin',
      email: 'juan.santos@example.com',
      password: 'password123',
      status: 'Active',
      isFirstLogin: false,
      dean: 'Dr. Maria Rodriguez',
      assignedProgramHead: 'Prof. Carlos Mendez',
      yearsOfTeachingExperience: '10',
      yearHired: '2015',
      yearRegularized: '2017',
      highestEducationalAttainment: 'PhD in Computer Science',
      professionalLicense: 'Licensed Professional Teacher',
      employmentStatus: 'Regular',
      rank: 'Professor'
    },
    {
      employeeId: 'EMP002',
      department: 'CIT Department',
      lastname: 'Reyes',
      firstname: 'Ana',
      middleInitial: 'B',
      role: 'admin',
      email: 'ana.reyes@example.com',
      password: 'password123',
      status: 'Active',
      isFirstLogin: false,
      dean: 'Dr. Maria Rodriguez',
      assignedProgramHead: 'Prof. Carlos Mendez',
      yearsOfTeachingExperience: '8',
      yearHired: '2017',
      yearRegularized: '2019',
      highestEducationalAttainment: 'Masters in Information Technology',
      professionalLicense: 'Licensed Professional Teacher',
      employmentStatus: 'Regular',
      rank: 'Associate Professor'
    },
    {
      employeeId: 'EMP003',
      department: 'CIT Department',
      lastname: 'Garcia',
      firstname: 'Leo',
      middleInitial: 'C',
      role: 'Faculty',
      email: 'leo.garcia@example.com',
      password: 'password123',
      status: 'Active',
      isFirstLogin: false,
      dean: 'Dr. Maria Rodriguez',
      assignedProgramHead: 'Prof. Carlos Mendez',
      yearsOfTeachingExperience: '5',
      yearHired: '2020',
      yearRegularized: '2022',
      highestEducationalAttainment: 'Masters in Computer Science',
      professionalLicense: 'Licensed Professional Teacher',
      employmentStatus: 'Regular',
      rank: 'Instructor'
    },
    {
      employeeId: 'EMP004',
      department: 'Active Learning Center',
      lastname: 'Cruz',
      firstname: 'Pedro',
      middleInitial: 'D',
      role: 'Observer (ALC)',
      email: 'pedro.cruz@example.com',
      password: 'password123',
      status: 'Active',
      isFirstLogin: false,
      dean: 'Dr. Maria Rodriguez',
      assignedProgramHead: 'Prof. Carlos Mendez',
      yearsOfTeachingExperience: '3',
      yearHired: '2022',
      yearRegularized: '',
      highestEducationalAttainment: 'Bachelor of Education',
      professionalLicense: 'Licensed Professional Teacher',
      employmentStatus: 'Probationary',
      rank: 'Observer'
    },
    {
      employeeId: 'EMP005',
      department: 'Student Learning Center',
      lastname: 'Ramos',
      firstname: 'Celia',
      middleInitial: 'E',
      role: 'Observer (SLC)',
      email: 'celia.ramos@example.com',
      password: 'password123',
      status: 'Active',
      isFirstLogin: false,
      dean: 'Dr. Maria Rodriguez',
      assignedProgramHead: 'Prof. Carlos Mendez',
      yearsOfTeachingExperience: '4',
      yearHired: '2021',
      yearRegularized: '2023',
      highestEducationalAttainment: 'Masters in Education',
      professionalLicense: 'Licensed Professional Teacher',
      employmentStatus: 'Regular',
      rank: 'Observer'
    }
];

// Load environment variables
require('dotenv').config();

async function seedDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);      
    console.log('✅ Connected to DB');

    await Employee.deleteMany({});
    console.log('🧹 Old employees removed');

    for (let emp of seedEmployees) {
      console.log(`Creating employee ${emp.employeeId} with password: "${emp.password}"`);
      
      // Employee model pre-save hook will handle password hashing automatically
      await Employee.create(emp);
      console.log(`✓ Created employee ${emp.employeeId}`);
    }

    console.log('🌱 Seed data inserted');
    process.exit();
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seedDB();

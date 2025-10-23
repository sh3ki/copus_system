const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const session = require('express-session');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const User = require('./model/employee');
const Log = require('./model/log');
const Schedule = require('./model/schedule');
const CopusObservation = require('./model/copusObservation'); 

const app = express();
const port = 3000;

// MongoDB Connection
mongoose.connect('mongodb+srv://copusAdmin:sK8ZGlLEuWsXavyc@cluster0.ugspmft.mongodb.net/copusDB?retryWrites=true&w=majority&appName=copusDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); // for form submissions

app.use(session({
  secret: 'blehHAHA', // replace with a secure secret in production
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));

// Set EJS and static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Random math question endpoint
app.get('/math-question', (req, res) => {
  const a = Math.floor(Math.random() * 99) + 1; // a: 1–99
  const maxB = 100 - a; // make sure a + b ≤ 100
  const b = Math.floor(Math.random() * maxB) + 1; // b: 1–(100-a)

  res.json({
    a,
    b,
    result: a + b
  });
});

// Public Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});


// Modify this cause i dont tested it yet
const crypto = require('crypto');

app.post('/forgot-password', async (req, res) => {
  const { employeeId } = req.body;

  try {
    const user = await User.findOne({ employeeId });
    if (!user) {
      return res.render('forgot_password_change'); // no user found, still show success page for security
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry
    await user.save();

    req.session.employeeId = employeeId;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'copus6251@gmail.com',
        pass: 'spgh zwvd qevg oxoe '
      }
    });

    const mailOptions = {
      from: '"Admin" <copus6251@gmail.com>',
      to: user.email,
      subject: 'Password Reset - PHINMA Copus System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px; border: 1px solid #ddd;">
          <h2 style="color: #2c3e50;">Hello ${user.firstname} ${user.lastname},</h2>
          <p>You requested to reset your password. Use the code below to verify your identity:</p>
          <h3 style="color: #e74c3c;">${resetToken}</h3>
          <p>If you did not request this, please ignore this email.</p>
          <p>– PHINMA IT Team</p>
        </div>
      `
    };

    console.log('Sending reset email to:', user.email);
    await transporter.sendMail(mailOptions);
    res.render('forgot_password_change');

  } catch (err) {
    console.error('Forgot password error:', err);
    console.log(err);
  }
});


app.post('/forgot-password-change', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  const employeeId = req.session.employeeId;

  console.log(employeeId);

  if (!employeeId) {
    return res.status(403).send('Session expired. Please try again.');
  }

  try {
    const user = await User.findOne({
      employeeId,
      resetToken,
      resetTokenExpiry: { $gt: Date.now() } // check token not expired
    });

    if (!user) {
      return res.status(400).send('Invalid token or session expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    req.session.employeeId = null;

    res.redirect('/login');
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

// Login Handling
app.post('/login', async (req, res) => {
  const { employee, password } = req.body;

  try {
    const foundEmployee = await User.findOne({ employeeId: employee });
    if (!foundEmployee) return res.redirect('/login?error=1');

    const isMatch = await bcrypt.compare(password, foundEmployee.password);
    if (!isMatch) return res.redirect('/login?error=1');

    // Check if employee is active (Comment this part if the login is not working)
    if (foundEmployee.status !== 'Active' && foundEmployee.status !== 'active') {
      return res.render('login', { error: 'Your account is inactive. Please contact admin.' });
    }

    // Store user session
    req.session.user = {
      id: foundEmployee._id,
      role: foundEmployee.role,
      employeeId: foundEmployee.employeeId
    };

    // If not super_admin and it's the first login, redirect to change password
    if (foundEmployee.role !== 'super_admin' && foundEmployee.isFirstLogin) {
      return res.redirect('/change_password');
    }

    console.log(foundEmployee.role);
    // Redirect based on role
    switch (foundEmployee.role) {
      case 'super_admin':
        return res.redirect('/super_admin_dashboard');
      case 'admin':
        return res.redirect('/admin_dashboard');
      case 'Observer':
        return res.redirect('/Observer_dashboard');
      case 'Faculty':
        return res.redirect('/CIT_Faculty_dashboard');
      default:
        return res.redirect('/login?error=1');
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).send('Internal Server Error');
  }
});

// Change password after logging in for the first time
app.get('/change_password', isAuthenticated, (req, res) => {
  res.render('change_password'); // Create change_password.ejs in your views
});

app.post('/change_password', isAuthenticated, async (req, res) => {
  const { newPassword } = req.body;

  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(req.session.user.id, {
      password: hashedPassword,
      isFirstLogin: false
    });

    // Redirect to dashboard based on role
    const user = await User.findById(req.session.user.id);
    switch (user.role) {
      case 'super_admin':
        return res.redirect('/super_admin_dashboard');
      case 'admin':
        return res.redirect('/admin_dashboard');
      case 'Observer':
        return res.redirect('/observer_dashboard');
      case 'Faculty':
        return res.redirect('/CIT_Faculty_dashboard');
      default:
        return res.redirect('/');
    }
  } catch (err) {
    console.error('Password update error:', err);
    return res.status(500).send('Error updating password');
  }
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Failed to log out.');
    }
    res.redirect('/login');
  });
});

// CIT Faculty Pages
// app.get('/CIT_Faculty_dashboard', isAuthenticated, (req, res) => res.render('CIT_Faculty/dashboard'));
app.get('/CIT_Faculty_copus_result', isAuthenticated, (req, res) => res.render('CIT_Faculty/copus_result'));
app.get('/CIT_Faculty_copus_summary', isAuthenticated, (req, res) => res.render('CIT_Faculty/copus_summary'));
app.get('/CIT_Faculty_copus_history', isAuthenticated, (req, res) => res.render('CIT_Faculty/copus_history'));
// app.get('/CIT_Faculty_schedule_management', isAuthenticated, (req, res) => res.render('CIT_Faculty/schedule_management'));
app.get('/CIT_Faculty_setting', isAuthenticated, (req, res) => res.render('CIT_Faculty/setting'));

// CIT Faculty Pages
app.get('/CIT_Faculty_dashboard', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) return res.redirect('/login');

    const schedules = await Schedule.find({
      firstname: user.firstname,
      lastname: user.lastname
    });

    const eventMap = {};

    schedules.forEach(sch => {
      const date = new Date(sch.date).toISOString().split('T')[0];
      if (!eventMap[date]) eventMap[date] = [];
      eventMap[date].push(sch);
    });

    const calendarEvents = Object.entries(eventMap).map(([date, scheduleList]) => {
      const total = scheduleList.length;
      const totalCompleted = scheduleList.filter(s => s.status.toLowerCase() === 'completed').length;
      const totalCancelled = scheduleList.filter(s => s.status.toLowerCase() === 'cancelled').length;
      const totalPending = scheduleList.filter(s => s.status.toLowerCase() === 'pending').length;

      let color = 'orange';
      let statusLabel = 'Pending';

      if (totalCompleted === total) {
        color = 'green';
        statusLabel = 'Completed';
      } else if (totalCancelled === total) {
        color = 'red';
        statusLabel = 'Cancelled';
      } else if (totalPending === total) {
        color = 'orange';
        statusLabel = 'Pending';
      } else {
        color = 'blue';
        statusLabel = `${totalCompleted} ✅ / ${totalCancelled} ❌ / ${totalPending} ⏳`;
      }

      return {
        title: statusLabel,
        date,
        color
      };
    });

    // ✅ Now render the view after processing
    res.render('CIT_Faculty/dashboard', {
      employeeId: user.employeeId,
      firstName: user.firstname,
      lastName: user.lastname,
      calendarEvents: JSON.stringify(calendarEvents)
    });

  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    return res.status(500).send('Internal Server Error');
  }
});

const parseDateTime = (dateStr, timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

app.post('/faculty_create_schedule', isAuthenticated, async (req, res) => {
  const {
    firstname,
    lastname,
    department,
    date,
    start_time,
    end_time,
    year_level,
    semester,
    subject_code,
    subject,
    observer,
    modality,
  } = req.body;

  const user = await User.findById(req.session.user.id);  
  const employee_id = user.employeeId;

  try {
    // Convert start_time and end_time to actual Date objects
    const newStart = parseDateTime(date, start_time);
    const newEnd = parseDateTime(date, end_time);

    // Find overlapping schedules for the same observer and approved status
    const conflict = await Schedule.findOne({
      observer,
      date: new Date(date),
      status: 'approved',
    }).then(results => {
      return results && parseDateTime(results.date, results.start_time) < newEnd &&
             parseDateTime(results.date, results.end_time) > newStart;
    });

    if (conflict) {
      const schedules = await Schedule.find({ employee_id }).sort({ timestamp: -1 });
      const observers = await User.find({ role: 'Observer' });

      return res.render('CIT_Faculty/schedule_management', {
        schedules,
        observers,
        firstName: user.firstname,
        lastName: user.lastname,
        employeeId: user.employeeId,
        department: user.department,
        errorMessage: 'The selected observer already has an approved appointment at this time.'
      });
    }

    // Save new schedule
    const newSchedule = new Schedule({
      employee_id,
      firstname,
      lastname,
      department,
      date,
      start_time,
      end_time,
      year_level,
      semester,
      subject_code,
      subject,
      observer,
      modality,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newSchedule.save();
    
    await Log.create({
      action: 'Create Schedule',
      performedBy: user.id,
      performedByRole: user.role,
      details: `Created a schedule for ${firstname} ${lastname} (Observer: ${observer}). Date: ${date}`
    });

    res.redirect('/CIT_Faculty_schedule_management');
  } catch (err) {
    console.error('Error creating schedule:', err);
    res.redirect('/CIT_Faculty_schedule_management');
  }
});


app.get('/CIT_Faculty_schedule_management', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) return res.redirect('/login');

    const schedules = await Schedule.find({ employee_id: user.employeeId }).sort({ timestamp: -1 });
    const observers = await User.find({role : "Observer"});
    console.log(schedules)
    res.render('CIT_Faculty/schedule_management', { schedules, observers, firstName : user.firstname, lastName : user.lastname, employeeId : user.employeeId, department : user.department });
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).send('Failed to load logs');
  }
});

//  In this part the date is not being updated in the database fix it if may time
// Cancel schedule
app.post('/faculty/schedule/cancel/:id', isAuthenticated, async (req, res) => {
  await Schedule.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
  res.redirect('/CIT_Faculty_schedule_management');
});

// Complete schedule
app.post('/faculty/schedule/complete/:id', isAuthenticated, async (req, res) => {
  await Schedule.findByIdAndUpdate(req.params.id, { status: 'completed' });
  res.redirect('/CIT_Faculty_schedule_management');
});

// Approve schedule
app.post('/faculty/schedule/approve/:id', isAuthenticated, async (req, res) => {
  await Schedule.findByIdAndUpdate(req.params.id, { status: 'approved' });
  res.redirect('/CIT_Faculty_schedule_management');
});

// Update schedule
app.post('/faculty/schedule/update/:id', isAuthenticated, async (req, res) => {
  const { firstname, lastname, department, start_time, end_time, year_level, semester, subject, subject_code, observer, modality } = req.body;

  await Schedule.findByIdAndUpdate(req.params.id, {
    firstname,
    lastname,
    department,
    start_time,
    end_time,
    year_level,
    semester,
    subject,
    subject_code,
    observer,
    modality,
    updatedAt: new Date()
  });

  res.redirect('/CIT_Faculty_schedule_management');
});


// Observer Dashboard
app.get('/Observer_dashboard', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) return res.redirect('/login');

    // Fetch only schedules for the same first and last name
    const name = user.firstname  +" " +user.lastname
    console.log(name);
    const schedules = await Schedule.find({ observer: name });

    console.log(schedules);

    const eventMap = {};

    // Group schedules by date
    schedules.forEach(sch => {
      const date = new Date(sch.date).toISOString().split('T')[0];
      if (!eventMap[date]) eventMap[date] = [];
      eventMap[date].push(sch);
    });

    const calendarEvents = Object.entries(eventMap).map(([date, scheduleList]) => {
      const total = scheduleList.length;
      const totalCompleted = scheduleList.filter(s => s.status.toLowerCase() === 'completed').length;
      const totalCancelled = scheduleList.filter(s => s.status.toLowerCase() === 'cancelled').length;
      const totalPending = scheduleList.filter(s => s.status.toLowerCase() === 'pending').length;

      let color = 'orange';
      let statusLabel = 'Pending';

      if (totalCompleted === total) {
        color = 'green';
        statusLabel = 'Completed';
      } else if (totalCancelled === total) {
        color = 'red';
        statusLabel = 'Cancelled';
      } else if (totalPending === total) {
        color = 'orange';
        statusLabel = 'Pending';
      } else {
        color = 'blue';
        statusLabel = `${totalCompleted} ✅ / ${totalCancelled} ❌ / ${totalPending} ⏳`;
      }

      return {
        title: statusLabel,
        date,
        color
      };
    });

    res.render('Observer/dashboard', {
      employeeId: user.employeeId,
      firstName: user.firstname,
      lastName: user.lastname,
      calendarEvents: JSON.stringify(calendarEvents)
    });

  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/Observer_schedule_management', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) return res.redirect('/login');

    const name = user.firstname  + " " + user.lastname
    const schedules = await Schedule.find({ observer: name }).sort({ timestamp: -1 });
    console.log(schedules)
    res.render('Observer/schedule_management', { schedules, firstName : user.firstname, lastName : user.lastname, employeeId : user.employeeId });
  } catch (err) {
    console.error('Error fetching logs:', err); 
    res.status(500).send('Failed to load logs');
  }
});

// Cancel schedule
app.post('/observer/schedule/cancel/:id', isAuthenticated, async (req, res) => {
  await Schedule.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
  res.redirect('/Observer_schedule_management');
});

// Complete schedule
app.post('/observer/schedule/complete/:id', isAuthenticated, async (req, res) => {
  await Schedule.findByIdAndUpdate(req.params.id, { status: 'completed' });
  res.redirect('/Observer_schedule_management');
});

// Approve schedule
app.post('/observer/schedule/approve/:id', isAuthenticated, async (req, res) => {
  await Schedule.findByIdAndUpdate(req.params.id, { status: 'approved' });
  res.redirect('/Observer_schedule_management');
});

app.get('/observer_copus_result',isAuthenticated, (req, res) => res.render('Observer/copus_result'));

app.get('/observer_copus', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) return res.redirect('/login');

    // Fetch all the necessary fields from the schedules where the observer matches and status is 'approved'
    const schedules = await Schedule.find(
      { observer: user.firstname + " " + user.lastname, status: 'approved' }
    )
    .select('firstname lastname department date start_time end_time year_level semester subject_code subject observer modality');

    res.render('Observer/copus', {
      schedules: schedules, // Pass schedules to the view
      firstName: user.firstname,
      lastName: user.lastname,
      employeeId: user.employeeId
    });
  } catch (err) {
    console.error('Error fetching approved schedules:', err);
    res.status(500).send('Internal Server Error');
  }
});


// Assuming you have a model for schedules, for example Schedule.findOne() to get the approved schedule.
app.get('/observer_copus_start', isAuthenticated, async (req, res) => {
  try {
    // Fetch approved schedule from the database (adjust to your actual data source)
    const schedule = await Schedule.findOne({ status: 'approved' }).exec();

    if (!schedule) {
      return res.status(404).send('No approved schedule found');
    }

    // Prepare the schedule data to pass into the template
    const copusDetails = {
      fullname: `${schedule.firstname} ${schedule.lastname}`,
      department: schedule.department,
      date: new Date(schedule.date).toLocaleDateString(),
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      yearLevel: schedule.year_level,
      semester: schedule.semester,
      subjectCode: schedule.subject_code,
      subjectName: schedule.subject_name,
      mode: schedule.modality,
      observer: schedule.observer
    };

    // Render the view with the fetched schedule details
    res.render('Observer/copus_start', { copusDetails });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/observer_copus_start2', isAuthenticated, async (req, res) => {
  try {
    // Fetch approved schedule from the database (adjust to your actual data source)
    const schedule = await Schedule.findOne({ status: 'approved' }).exec();

    if (!schedule) {
      return res.status(404).send('No approved schedule found');
    }

    // Prepare the schedule data to pass into the template
    const copusDetails = {
      fullname: `${schedule.firstname} ${schedule.lastname}`,
      department: schedule.department,
      date: new Date(schedule.date).toLocaleDateString(),
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      yearLevel: schedule.year_level,
      semester: schedule.semester,
      subjectCode: schedule.subject_code,
      subjectName: schedule.subject_name,
      mode: schedule.modality,
      observer: schedule.observer
    };

    // Render the view with the fetched schedule details
    res.render('Observer/copus_start2', { copusDetails });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/observer_copus_start3', isAuthenticated, async (req, res) => {
  try {
    // Fetch approved schedule from the database (adjust to your actual data source)
    const schedule = await Schedule.findOne({ status: 'approved' }).exec();

    if (!schedule) {
      return res.status(404).send('No approved schedule found');
    }

    // Prepare the schedule data to pass into the template
    const copusDetails = {
      fullname: `${schedule.firstname} ${schedule.lastname}`,
      department: schedule.department,
      date: new Date(schedule.date).toLocaleDateString(),
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      yearLevel: schedule.year_level,
      semester: schedule.semester,
      subjectCode: schedule.subject_code,
      subjectName: schedule.subject_name,
      mode: schedule.modality,
      observer: schedule.observer
    };

    // Render the view with the fetched schedule details
    res.render('Observer/copus_start3', { copusDetails });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).send('Internal server error');
  }
});

// app.get('/observer_copus_start/:scheduleId', isAuthenticated, async (req, res) => {
//   try {
//     const scheduleId = req.params.scheduleId; // Get scheduleId from URL params

//     // Fetch the schedule by its ID
//     const schedule = await Schedule.findById(scheduleId);

//     if (!schedule) {
//       return res.status(404).send('Schedule not found');
//     }

//     // Prepare the schedule data to pass to the view
//     const copusDetails = {
//       fullname: `${schedule.firstname} ${schedule.lastname}`,
//       department: schedule.department,
//       date: new Date(schedule.date).toLocaleDateString(),
//       startTime: schedule.start_time,
//       endTime: schedule.end_time,
//       yearLevel: schedule.year_level,
//       semester: schedule.semester,
//       subjectCode: schedule.subject_code,
//       subjectName: schedule.subject_name,
//       mode: schedule.modality,
//       observer: schedule.observer
//     };

//     // Render the view with the fetched schedule details
//     res.render('Observer/copus_start', { copusDetails });
//   } catch (error) {
//     console.error('Error fetching schedule:', error);
//     res.status(500).send('Internal server error');
//   }
// });

app.get('/observer_copus_start/:scheduleId', isAuthenticated, async (req, res) => {
  try {
    const scheduleId = req.params.scheduleId;
    const schedule = await Schedule.findById(scheduleId);

    if (!schedule) {
      return res.status(404).send('Schedule not found');
    }

    const copusDetails = {
      fullname: `${schedule.firstname} ${schedule.lastname}`,
      department: schedule.department,
      date: new Date(schedule.date).toLocaleDateString(),
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      yearLevel: schedule.year_level,
      semester: schedule.semester,
      subjectCode: schedule.subject_code,
      subjectName: schedule.subject_name,
      mode: schedule.modality,
      observer: schedule.observer
    };

    res.render('Observer/copus_start', { copusDetails });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).send('Internal server error');
  }
});

app.post('/observer_copus_result1', isAuthenticated, async (req, res) => {
  try {
    const { rows } = req.body;
    const user = req.session.user;
    const scheduleId = req.query.scheduleId;

    const copusObservation = new CopusObservation({
      scheduleId,
      studentActions: rows.reduce((acc, row) => {
        for (const action in row.student) {
          acc[action] = (acc[action] || 0) + row.student[action];
        }
        return acc;
      }, {}),
      teacherActions: rows.reduce((acc, row) => {
        for (const action in row.teacher) {
          acc[action] = (acc[action] || 0) + row.teacher[action];
        }
        return acc;
      }, {}),
      engagementLevels: {
        High: rows.reduce((acc, row) => acc + (row.engagement?.High || 0), 0),
        Med: rows.reduce((acc, row) => acc + (row.engagement?.Med || 0), 0),
        Low: rows.reduce((acc, row) => acc + (row.engagement?.Low || 0), 0),
      },
      comments: rows.map(row => row.comment).join(' '),
      observerId: user.id
    });

    await copusObservation.save();

    // res.redirect(`/observer_copus_result1`);
    res.redirect(`/observer_copus_start2`);
  } catch (err) {
    console.error('Error saving COPUS observation:', err);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/observer_copus_result1', isAuthenticated, async (req, res) => {
  try {
    // Get the latest observation for the current user (based on the observerId or scheduleId)
    const copusObservation = await CopusObservation.findOne({ observerId: req.session.user.id }).sort({ dateSubmitted: -1 }).exec();

    // Process the data (this part may need to be adjusted based on your schema and what you want to display)
    const tallies = {
      studentActions: copusObservation.studentActions,
      teacherActions: copusObservation.teacherActions,
      engagementLevels: copusObservation.engagementLevels,
      totalIntervals: copusObservation.studentActions ? Object.keys(copusObservation.studentActions).length : 0
    };

    const engagementPercentages = {
      High: (copusObservation.engagementLevels.High / tallies.totalIntervals) * 100,
      Med: (copusObservation.engagementLevels.Med / tallies.totalIntervals) * 100,
      Low: (copusObservation.engagementLevels.Low / tallies.totalIntervals) * 100
    };

    console.log(tallies)

    // Render the result page with the calculated tallies and engagement percentages
    res.render('Observer/copus_result1', {
      tallies,
      engagementPercentages
    });
  } catch (err) {
    console.error('Error retrieving observation results:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/observer_copus_result1', isAuthenticated, async (req, res) => {
  try {
    const { rows } = req.body;
    const user = req.session.user;
    const scheduleId = req.query.scheduleId;

    const copusObservation = new CopusObservation({
      scheduleId,
      studentActions: rows.reduce((acc, row) => {
        for (const action in row.student) {
          acc[action] = (acc[action] || 0) + row.student[action];
        }
        return acc;
      }, {}),
      teacherActions: rows.reduce((acc, row) => {
        for (const action in row.teacher) {
          acc[action] = (acc[action] || 0) + row.teacher[action];
        }
        return acc;
      }, {}),
      engagementLevels: {
        High: rows.reduce((acc, row) => acc + (row.engagement.High || 0), 0),
        Med: rows.reduce((acc, row) => acc + (row.engagement.Med || 0), 0),
        Low: rows.reduce((acc, row) => acc + (row.engagement.Low || 0), 0),
      },
      comments: rows.map(row => row.comment).join(' '),
      observerId: user.id
    });

    await copusObservation.save();
    res.redirect(`/observer_copus_result1`);
  } catch (err) {
    console.error('Error saving COPUS observation:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/observer_copus_summary',isAuthenticated, (req, res) => res.render('Observer/copus_summary'));
app.get('/observer_copus_history',isAuthenticated, (req, res) => res.render('Observer/copus_history'));
app.get('/observer_schedule_management',isAuthenticated, (req, res) => res.render('Observer/schedule_management'));
app.get('/observer_setting',isAuthenticated, (req, res) => res.render('Observer/setting'));

// Admin Pages
app.get('/admin_dashboard', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) return res.redirect('/login');

    const schedules = await Schedule.find({});
    const eventMap = {};

    // Group schedules by date
    schedules.forEach(sch => {
      const date = new Date(sch.date).toISOString().split('T')[0];
      if (!eventMap[date]) eventMap[date] = [];
      eventMap[date].push(sch);
    });

    const calendarEvents = Object.entries(eventMap).map(([date, scheduleList]) => {
      const total = scheduleList.length;

      const totalCompleted = scheduleList.filter(s => s.status.toLowerCase() === 'completed').length;
      const totalCancelled = scheduleList.filter(s => s.status.toLowerCase() === 'cancelled').length;
      const totalPending = scheduleList.filter(s => s.status.toLowerCase() === 'pending').length;

      let color = 'orange';
      let statusLabel = 'Pending';

      if (totalCompleted === total) {
        color = 'green';
        statusLabel = 'Completed';
      } else if (totalCancelled === total) {
        color = 'red';
        statusLabel = 'Cancelled';
      } else if (totalPending === total) {
        color = 'orange';
        statusLabel = 'Pending';
      } else {
        color = 'blue';
        statusLabel = `${totalCompleted} ✅ / ${totalCancelled} ❌ / ${totalPending} ⏳`;
      }

      return {
        title: statusLabel,
        date,
        color
      };
    });

    res.render('Admin/dashboard', {
      employeeId: user.employeeId,
      firstName: user.firstname,
      lastName: user.lastname,
      calendarEvents: JSON.stringify(calendarEvents)
    });

  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/admin_user_management', isAuthenticated, async (req, res) => {
  try {
    const employees = await User.find({ role: { $ne: 'admin' } });
    res.render('Admin/user_management', { employees });
  } catch (err) {
    res.status(500).send('Failed to load user management view');
  }
});

app.post('/admin_update_user_status', isAuthenticated, async (req, res) => {
  const { employeeId, status } = req.body;

  try {
    const user = await User.findById(req.session.user.id);
    const targetEmployee = await User.findOneAndUpdate(
      { employeeId },
      { status },
      { new: true } // Return the updated doc
    );

    if (!targetEmployee) return res.status(404).send('User not found');

    await Log.create({
      action: 'Update Employee Status',
      performedBy: user.id,
      performedByRole: user.role,
      details: `Changed status of employee ${targetEmployee.firstname} ${targetEmployee.lastname} (ID: ${employeeId}) to ${status}.`
    });

    res.status(200).send('Status updated');
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).send('Failed to update user status');
  }
});

app.post('/admin_update_user', isAuthenticated, async (req, res) => {
  const { employeeId, department, lastname, firstname, role, email } = req.body;

  try {
    const user = await User.findById(req.session.user.id);
    const updated = await User.findOneAndUpdate(
      { employeeId },
      { department, lastname, firstname, role, email },
      { new: true }
    );

    if (!updated) return res.status(404).send('Employee not found');

    await Log.create({
      action: 'Update Employee',
      performedBy: user.id,
      performedByRole: user.role,
      details: `Updated employee: ${firstname} ${lastname} (ID: ${employeeId}), role: ${role}, department: ${department}.`
    });

    res.redirect('/admin_user_management');
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).send('Failed to update user');
  }
});

app.post('/admin_create_schedule', isAuthenticated, async (req, res) => {
  const {
    firstname,
    lastname,
    department,
    date,
    start_time,
    end_time,
    year_level,
    semester,
    subject_code,
    subject,
    observer,
    modality,
  } = req.body;

  const user = await User.findById(req.session.user.id);  

  try {
    const newSchedule = new Schedule({
      firstname,
      lastname,
      department,
      date,
      start_time,
      end_time,
      year_level,
      semester,
      subject_code,
      subject,
      observer,
      modality,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  
    await newSchedule.save();
    
    await Log.create({
      action: 'Create Schedule',
      performedBy: user.id,
      performedByRole: user.role,
      details: `Created a schedule for ${firstname} ${lastname} (Observer: ${observer}). Date : ${date}`
    });

    res.redirect('/admin_schedule');
  } catch {
    res.redirect('/admin_schedule');
  }
})

app.get('/admin_schedule', isAuthenticated, async (req, res) => {
    try {
    const user = await User.findById(req.session.user.id);
    if (!user) return res.redirect('/login');

    const schedules = await Schedule.find().sort({ timestamp: -1 });
    console.log(schedules)
    res.render('Admin/schedule', { schedules, firstName : user.firstname, lastName : user.lastname, employeeId : user.employeeId });
  } catch (err) {
    console.error('Error fetching logs:', err); 
    res.status(500).send('Failed to load logs');
  }
});


// Cancel schedule
app.post('/admin/schedule/cancel/:id', isAuthenticated, async (req, res) => {
  await Schedule.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
  res.redirect('/admin_schedule');
});

// Complete schedule
app.post('/admin/schedule/complete/:id', isAuthenticated, async (req, res) => {
  await Schedule.findByIdAndUpdate(req.params.id, { status: 'completed' });
  res.redirect('/admin_schedule');
});

// Approve schedule
app.post('/admin/schedule/approve/:id', isAuthenticated, async (req, res) => {
  await Schedule.findByIdAndUpdate(req.params.id, { status: 'approved' });
  res.redirect('/admin_schedule');
});

// Update schedule
app.post('/admin/schedule/update/:id', isAuthenticated, async (req, res) => {
  const { firstname, lastname, department, start_time, end_time, year_level, semester, subject, subject_code, observer, modality } = req.body;

  await Schedule.findByIdAndUpdate(req.params.id, {
    firstname,
    lastname,
    department,
    start_time,
    end_time,
    year_level,
    semester,
    subject,
    subject_code,
    observer,
    modality,
    updatedAt: new Date()
  });

  res.redirect('/super_admin_schedule');
});

app.get('/admin_copus_result',isAuthenticated, (req, res) => res.render('Admin/copus_result'));
app.get('/admin_copus_history',isAuthenticated, (req, res) => res.render('Admin/copus_history'));
app.get('/admin_setting',isAuthenticated, (req, res) => res.render('Admin/setting'));

// Super Admin Pages
app.get('/super_admin_dashboard', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) return res.redirect('/login');

    const schedules = await Schedule.find({});
    const eventMap = {};

    // Group schedules by date
    schedules.forEach(sch => {
      const date = new Date(sch.date).toISOString().split('T')[0];
      if (!eventMap[date]) eventMap[date] = [];
      eventMap[date].push(sch);
    });

    const calendarEvents = Object.entries(eventMap).map(([date, scheduleList]) => {
      const total = scheduleList.length;

      const totalCompleted = scheduleList.filter(s => s.status.toLowerCase() === 'completed').length;
      const totalCancelled = scheduleList.filter(s => s.status.toLowerCase() === 'cancelled').length;
      const totalPending = scheduleList.filter(s => s.status.toLowerCase() === 'pending').length;

      let color = 'orange';
      let statusLabel = 'Pending';

      if (totalCompleted === total) {
        color = 'green';
        statusLabel = 'Completed';
      } else if (totalCancelled === total) {
        color = 'red';
        statusLabel = 'Cancelled';
      } else if (totalPending === total) {
        color = 'orange';
        statusLabel = 'Pending';
      } else {
        color = 'blue';
        statusLabel = `${totalCompleted} ✅ / ${totalCancelled} ❌ / ${totalPending} ⏳`;
      }

      return {
        title: statusLabel,
        date,
        color
      };
    });

    res.render('Super_Admin/dashboard', {
      employeeId: user.employeeId,
      firstName: user.firstname,
      lastName: user.lastname,
      calendarEvents: JSON.stringify(calendarEvents)
    });

  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/super_admin_user_management', isAuthenticated, async (req, res) => {
  try {
    const employees = await User.find({ role: { $ne: 'super_admin' } });
    res.render('Super_Admin/user_management', { employees });
  } catch (err) {
    res.status(500).send('Failed to load user management view');
  }
});


// fix the front end add create the form for updating the user status also send an email once the process is success
app.post('/update_user_status', isAuthenticated, async (req, res) => {
  const { employeeId, status } = req.body;

  try {
    const user = await User.findById(req.session.user.id);
    const targetEmployee = await User.findOneAndUpdate(
      { employeeId },
      { status },
      { new: true } // Return the updated doc
    );

    if (!targetEmployee) return res.status(404).send('User not found');

    await Log.create({
      action: 'Update Employee Status',
      performedBy: user.id,
      performedByRole: user.role,
      details: `Changed status of employee ${targetEmployee.firstname} ${targetEmployee.lastname} (ID: ${employeeId}) to ${status}.`
    });

    res.status(200).send('Status updated');
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).send('Failed to update user status');
  }
});

// fix the front enf for this and test the backend and send an email tot he user once the proccess is a success
app.post('/update_user', isAuthenticated, async (req, res) => {
  const { employeeId, department, lastname, firstname, role, email } = req.body;

  try {
    const user = await User.findById(req.session.user.id);
    const updated = await User.findOneAndUpdate(
      { employeeId },
      { department, lastname, firstname, role, email },
      { new: true }
    );

    if (!updated) return res.status(404).send('Employee not found');

    await Log.create({
      action: 'Update Employee',
      performedBy: user.id,
      performedByRole: user.role,
      details: `Updated employee: ${firstname} ${lastname} (ID: ${employeeId}), role: ${role}, department: ${department}.`
    });

    res.redirect('/super_admin_user_management');
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).send('Failed to update user');
  }
});


// Find the observer and the one getting observed and send an email to them for notification
app.post('/create_schedule', isAuthenticated, async (req, res) => {
  const {
    firstname,
    lastname,
    department,
    date,
    start_time,
    end_time,
    year_level,
    semester,
    subject_code,
    subject,
    observer,
    modality,
  } = req.body;

  const user = await User.findById(req.session.user.id);  

  try {
    const newSchedule = new Schedule({
      firstname,
      lastname,
      department,
      date,
      start_time,
      end_time,
      year_level,
      semester,
      subject_code,
      subject,
      observer,
      modality,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  
    await newSchedule.save();
    
    await Log.create({
      action: 'Create Schedule',
      performedBy: user.id,
      performedByRole: user.role,
      details: `Created a schedule for ${firstname} ${lastname} (Observer: ${observer}). Date : ${date}`
    });

    res.redirect('/super_admin_schedule');
  } catch {
    res.redirect('/super_admin_schedule');
  }
})

app.get('/super_admin_schedule', isAuthenticated, async (req, res) => {
  try {
    const schedules = await Schedule.find().sort({ timestamp: -1 });
    res.render('Super_Admin/schedule', { schedules });
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).send('Failed to load logs');
  }
});

//  In this part the date is not being updated in the database fix it if may time
// Cancel schedule
app.post('/schedule/cancel/:id', isAuthenticated, async (req, res) => {
  await Schedule.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
  res.redirect('/super_admin_schedule');
});

// Complete schedule
app.post('/schedule/complete/:id', isAuthenticated, async (req, res) => {
  await Schedule.findByIdAndUpdate(req.params.id, { status: 'completed' });
  res.redirect('/super_admin_schedule');
});

// Update schedule
app.post('/schedule/update/:id', isAuthenticated, async (req, res) => {
  const { firstname, lastname, department, start_time, end_time, year_level, semester, subject, subject_code, observer, modality } = req.body;

  await Schedule.findByIdAndUpdate(req.params.id, {
    firstname,
    lastname,
    department,
    start_time,
    end_time,
    year_level,
    semester,
    subject,
    subject_code,
    observer,
    modality,
    updatedAt: new Date()
  });

  res.redirect('/super_admin_schedule');
});


app.get('/super_admin_copus_result', isAuthenticated, (req, res) => res.render('Super_Admin/copus_result'));
app.get('/super_admin_copus_history', isAuthenticated, (req, res) => res.render('Super_Admin/copus_history'));
app.get('/super_admin_setting', isAuthenticated, (req, res) => res.render('Super_Admin/setting'));

app.get('/super_admin_logs', isAuthenticated, async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 });
    res.render('Super_Admin/logs', { logs });
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).send('Failed to load logs');
  }
});

// Add Employee (Super Admin)
app.post('/add_employee', isAuthenticated, async (req, res) => {
  const {
    department,
    lastname,
    firstname,
    role,
    email,
  } = req.body;

  // Check if email ends with '@phinmaed.com'
  // if (!email.endsWith('@phinmaed.com')) {
    // return res.status(400).json({ error: 'Only PHINMA emails (@phinmaed.com) are allowed.' });
  // }

  // if the panel want to have the user different suername based on the role

  // let employeeId;
  
  // if(role == 'Faculty') {

  //   // generate random ID for the employee ID

  //   const randomPart1 = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  //   const randomPart2 = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  //   const employeeId = `TCH-${randomPart1}-${randomPart2}`;
  // } else if(role == 'Observer') {

  //   // generate random ID for the employee ID

  //   const randomPart1 = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  //   const randomPart2 = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  //   const employeeId = `OSV-${randomPart1}-${randomPart2}`;
  // } else {
  //   res.redirect('/super_admin_user_management');
  // }

  // generate random ID for the employee
  const randomPart1 = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  const randomPart2 = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  const employeeId = `EMP-${randomPart1}-${randomPart2}`;
  
  const password = employeeId;
  const user = await User.findById(req.session.user.id);

  console.log(user);

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or employee ID already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      employeeId,
      department,
      lastname,
      firstname,
      role,
      email,
      password: hashedPassword
    });

    await newUser.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'copus6251@gmail.com',
        pass: 'spgh zwvd qevg oxoe '
      }
    });

    const mailOptions = {
      from: '"Admin" <copus6251@gmail.com>',
      to: email,
      subject: 'Your Login Credentials - PHINMA Copus System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px; border: 1px solid #ddd;">
          <h2 style="color: #2c3e50;">Hello ${firstname} ${lastname},</h2>
          <p style="font-size: 15px; color: #333;">You have been added to the <strong>PHINMA Copus System</strong>. Here are your login credentials:</p>
          
          <div style="margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold;">Email:</td>
                <td style="padding: 8px;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Role:</td>
                <td style="padding: 8px;">${role}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Username:</td>
                <td style="padding: 8px;">${employeeId}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Password:</td>
                <td style="padding: 8px;">${password}</td>
              </tr>
            </table>
          </div>
    
          <p style="font-size: 15px; color: #333;">Please log in and change your password upon first login for security reasons.</p>
          
          <p style="margin-top: 30px; font-size: 14px; color: #555;">Best regards,<br><strong>PHINMA IT Team</strong></p>
        </div>
      `
    };
    

    await transporter.sendMail(mailOptions);

    // Add this to the logs page or create a log page
    await Log.create({
      action: 'Add Employee',
      performedBy: user.id,
      performedByRole: user.role,
      details: `Added an employee name : ${firstname} ${lastname} emplyoyee ID : (${employeeId}) with role ${role} in ${department}.`
    });

    res.redirect('/super_admin_user_management');

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add user or send email.' });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).send('404 - Page not found');
});

// Start Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Middleware
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  } else {
    return res.redirect('/login');
  }
}

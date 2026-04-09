#!/usr/bin/env node
require('dotenv').config();
const pool = require('../db');

// All 20 courses with their lectures
const coursesData = [
  {
    title: 'Full Stack Web Development (MERN)',
    description: 'Master the complete MERN stack - MongoDB, Express, React, and Node.js. Build production-ready full-stack applications with modern tools and best practices.',
    category: 'Web Development',
    level: 'Advanced',
    isFree: true,
    duration: '12 weeks',
    rating: 4.9,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'Introduction to MERN Stack', duration: '45:00', video_url: 'https://www.youtube.com/embed/7CqJlxBYj-M', order_index: 1 },
      { title: 'React Fundamentals', duration: '1:20:00', video_url: 'https://www.youtube.com/embed/bMknfKXIFA8', order_index: 2 },
      { title: 'Node.js & Express Basics', duration: '1:15:00', video_url: 'https://www.youtube.com/embed/Oe421EPjeBE', order_index: 3 },
      { title: 'MongoDB Integration', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/fgTGADljAeg', order_index: 4 },
      { title: 'Authentication with JWT', duration: '55:00', video_url: 'https://www.youtube.com/embed/mbsmsi7l3r4', order_index: 5 },
      { title: 'Deployment to Cloud', duration: '40:00', video_url: 'https://www.youtube.com/embed/l134cBAJCuc', order_index: 6 }
    ]
  },
  {
    title: 'React.js Complete Guide',
    description: 'Comprehensive React course covering hooks, context, routing, and performance optimization. Build modern, scalable React applications.',
    category: 'Web Development',
    level: 'Intermediate',
    isFree: true,
    duration: '8 weeks',
    rating: 4.8,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'React Introduction', duration: '35:00', video_url: 'https://www.youtube.com/embed/w7ejDZ8SWv8', order_index: 1 },
      { title: 'Components & Props', duration: '50:00', video_url: 'https://www.youtube.com/embed/Rh3tobg7hEo', order_index: 2 },
      { title: 'Hooks (useState, useEffect)', duration: '1:05:00', video_url: 'https://www.youtube.com/embed/O6P86uwfdR0', order_index: 3 },
      { title: 'Context API', duration: '45:00', video_url: 'https://www.youtube.com/embed/5LrDIWkK_Bc', order_index: 4 },
      { title: 'Routing with React Router', duration: '55:00', video_url: 'https://www.youtube.com/embed/Law7wfdg_ls', order_index: 5 },
      { title: 'Performance Optimization', duration: '40:00', video_url: 'https://www.youtube.com/embed/uojLJFt9SzY', order_index: 6 }
    ]
  },
  {
    title: 'Node.js Backend Mastery',
    description: 'Deep dive into Node.js backend development. Learn Express, REST APIs, authentication, middleware, and deployment strategies.',
    category: 'Backend Development',
    level: 'Intermediate',
    isFree: true,
    duration: '10 weeks',
    rating: 4.7,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'Node.js Fundamentals', duration: '50:00', video_url: 'https://www.youtube.com/embed/TlB_eWDSMt4', order_index: 1 },
      { title: 'Express Framework', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/L72fhGm1tfE', order_index: 2 },
      { title: 'REST API Development', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/pKd0Rpw7O48', order_index: 3 },
      { title: 'Authentication & Authorization', duration: '1:15:00', video_url: 'https://www.youtube.com/embed/mbsmsi7l3r4', order_index: 4 },
      { title: 'Error Handling & Middleware', duration: '45:00', video_url: 'https://www.youtube.com/embed/lY6icfhap2o', order_index: 5 },
      { title: 'Deployment', duration: '35:00', video_url: 'https://www.youtube.com/embed/l134cBAJCuc', order_index: 6 }
    ]
  },
  {
    title: 'PostgreSQL Database Design',
    description: 'Learn database design, SQL queries, indexing, transactions, and optimization techniques for PostgreSQL.',
    category: 'Database',
    level: 'Intermediate',
    isFree: true,
    duration: '6 weeks',
    rating: 4.6,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'PostgreSQL Introduction', duration: '40:00', video_url: 'https://www.youtube.com/embed/qw--VYLpxG4', order_index: 1 },
      { title: 'Database Design Principles', duration: '55:00', video_url: 'https://www.youtube.com/embed/ztHopE5Wnpc', order_index: 2 },
      { title: 'Advanced SQL Queries', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/HXV3zeQKqGY', order_index: 3 },
      { title: 'Indexes and Performance', duration: '50:00', video_url: 'https://www.youtube.com/embed/HubezKbFL7E', order_index: 4 },
      { title: 'Transactions & ACID', duration: '45:00', video_url: 'https://www.youtube.com/embed/pomxJOFVcQs', order_index: 5 },
      { title: 'Backup and Recovery', duration: '35:00', video_url: 'https://www.youtube.com/embed/SpAz1DBlfR0', order_index: 6 }
    ]
  },
  {
    title: 'Python for Beginners',
    description: 'Start your programming journey with Python. Learn syntax, data structures, OOP, and build real-world projects.',
    category: 'Programming',
    level: 'Beginner',
    isFree: true,
    duration: '8 weeks',
    rating: 4.8,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'Python Basics', duration: '45:00', video_url: 'https://www.youtube.com/embed/rfscVS0vtbw', order_index: 1 },
      { title: 'Data Types & Variables', duration: '40:00', video_url: 'https://www.youtube.com/embed/kqtD5dpn9C8', order_index: 2 },
      { title: 'Control Flow', duration: '50:00', video_url: 'https://www.youtube.com/embed/Zp5MuPOtsSY', order_index: 3 },
      { title: 'Functions & Modules', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/9Os0o3wzS_I', order_index: 4 },
      { title: 'Object-Oriented Programming', duration: '1:15:00', video_url: 'https://www.youtube.com/embed/JeznW_7DlB0', order_index: 5 },
      { title: 'File Handling & Projects', duration: '55:00', video_url: 'https://www.youtube.com/embed/4F2m91eKmts', order_index: 6 }
    ]
  },
  {
    title: 'Data Structures & Algorithms',
    description: 'Master fundamental data structures and algorithms. Prepare for coding interviews with problem-solving techniques.',
    category: 'Computer Science',
    level: 'Intermediate',
    isFree: true,
    duration: '10 weeks',
    rating: 4.9,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'Introduction to DSA', duration: '35:00', video_url: 'https://www.youtube.com/embed/8hly31xKli0', order_index: 1 },
      { title: 'Arrays and Strings', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/Db9ZYbJONHc', order_index: 2 },
      { title: 'Linked Lists', duration: '55:00', video_url: 'https://www.youtube.com/embed/R9PTBwOzceo', order_index: 3 },
      { title: 'Trees and Graphs', duration: '1:20:00', video_url: 'https://www.youtube.com/embed/1WitaGUKZc4', order_index: 4 },
      { title: 'Sorting & Searching', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/TzeBrDU-JaY', order_index: 5 },
      { title: 'Dynamic Programming', duration: '1:30:00', video_url: 'https://www.youtube.com/embed/oBt53YbR9Kk', order_index: 6 }
    ]
  },
  {
    title: 'Machine Learning Basics',
    description: 'Introduction to machine learning concepts, algorithms, and practical applications using Python and scikit-learn.',
    category: 'Data Science',
    level: 'Intermediate',
    isFree: true,
    duration: '12 weeks',
    rating: 4.7,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'ML Introduction', duration: '40:00', video_url: 'https://www.youtube.com/embed/ukzFI9rgwfU', order_index: 1 },
      { title: 'Supervised Learning', duration: '1:05:00', video_url: 'https://www.youtube.com/embed/aircAruvnKk', order_index: 2 },
      { title: 'Linear Regression', duration: '55:00', video_url: 'https://www.youtube.com/embed/7ArmBVF2dCs', order_index: 3 },
      { title: 'Classification Algorithms', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/4PHbKvyJ6Ac', order_index: 4 },
      { title: 'Neural Networks', duration: '1:20:00', video_url: 'https://www.youtube.com/embed/aircAruvnKk', order_index: 5 },
      { title: 'Model Evaluation', duration: '45:00', video_url: 'https://www.youtube.com/embed/85dtiMz9tSo', order_index: 6 }
    ]
  },
  {
    title: 'Flutter App Development',
    description: 'Build beautiful, native mobile applications for iOS and Android using Flutter and Dart.',
    category: 'Mobile Development',
    level: 'Intermediate',
    isFree: true,
    duration: '10 weeks',
    rating: 4.8,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'Flutter Introduction', duration: '40:00', video_url: 'https://www.youtube.com/embed/1ukSR1GRtMU', order_index: 1 },
      { title: 'Dart Programming', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/5rtujDjt50I', order_index: 2 },
      { title: 'Widgets & Layouts', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/1gDhl4leEzA', order_index: 3 },
      { title: 'State Management', duration: '1:15:00', video_url: 'https://www.youtube.com/embed/3tm-R7ymwhc', order_index: 4 },
      { title: 'Navigation & Routing', duration: '50:00', video_url: 'https://www.youtube.com/embed/nyvwx7o277U', order_index: 5 },
      { title: 'API Integration', duration: '55:00', video_url: 'https://www.youtube.com/embed/5xU5WH2kEc0', order_index: 6 }
    ]
  },
  {
    title: 'HTML, CSS & Bootstrap',
    description: 'Master web fundamentals - HTML structure, CSS styling, responsive design, and Bootstrap framework.',
    category: 'Web Development',
    level: 'Beginner',
    isFree: true,
    duration: '6 weeks',
    rating: 4.7,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1621839673705-6617adf9e890?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'HTML Fundamentals', duration: '45:00', video_url: 'https://www.youtube.com/embed/qz0aGYrrlhU', order_index: 1 },
      { title: 'CSS Basics', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/1PnVor36_40', order_index: 2 },
      { title: 'CSS Flexbox', duration: '35:00', video_url: 'https://www.youtube.com/embed/JJSoEo8JSnc', order_index: 3 },
      { title: 'CSS Grid', duration: '40:00', video_url: 'https://www.youtube.com/embed/EFafSYg-PkI', order_index: 4 },
      { title: 'Bootstrap Basics', duration: '55:00', video_url: 'https://www.youtube.com/embed/-qfEOE4vtxE', order_index: 5 },
      { title: 'Responsive Design', duration: '50:00', video_url: 'https://www.youtube.com/embed/srvUrASNj0s', order_index: 6 }
    ]
  },
  {
    title: 'Cyber Security Fundamentals',
    description: 'Learn security basics, ethical hacking, network security, and how to protect systems from cyber threats.',
    category: 'Security',
    level: 'Beginner',
    isFree: true,
    duration: '8 weeks',
    rating: 4.6,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'Introduction to Cybersecurity', duration: '40:00', video_url: 'https://www.youtube.com/embed/inWWhr5tnEA', order_index: 1 },
      { title: 'Network Security', duration: '55:00', video_url: 'https://www.youtube.com/embed/qiQR5rTSshw', order_index: 2 },
      { title: 'Cryptography Basics', duration: '50:00', video_url: 'https://www.youtube.com/embed/jhXCTbFnK8o', order_index: 3 },
      { title: 'Web Application Security', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/F5KJVuii0Yw', order_index: 4 },
      { title: 'Ethical Hacking', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/3Kq1MIfTWCE', order_index: 5 },
      { title: 'Security Best Practices', duration: '45:00', video_url: 'https://www.youtube.com/embed/lf3VqKHLmvQ', order_index: 6 }
    ]
  },
  {
    title: 'DevOps with Docker & CI/CD',
    description: 'Master DevOps practices, containerization with Docker, continuous integration and deployment pipelines.',
    category: 'DevOps',
    level: 'Advanced',
    isFree: true,
    duration: '10 weeks',
    rating: 4.8,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1605745341112-85968b19335b?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'DevOps Introduction', duration: '35:00', video_url: 'https://www.youtube.com/embed/Xrgk023l4lI', order_index: 1 },
      { title: 'Docker Basics', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/fqMOX6JJhGo', order_index: 2 },
      { title: 'Docker Compose', duration: '45:00', video_url: 'https://www.youtube.com/embed/Qw9zlE3t8Ko', order_index: 3 },
      { title: 'CI/CD Pipelines', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/scEDHsr3APg', order_index: 4 },
      { title: 'Kubernetes Basics', duration: '1:20:00', video_url: 'https://www.youtube.com/embed/X48VuDVv0do', order_index: 5 },
      { title: 'Monitoring & Logging', duration: '50:00', video_url: 'https://www.youtube.com/embed/7N5lq-rRWy0', order_index: 6 }
    ]
  },
  {
    title: 'Data Science with Python',
    description: 'Learn data analysis, visualization, and statistical modeling with Python, Pandas, NumPy, and Matplotlib.',
    category: 'Data Science',
    level: 'Intermediate',
    isFree: true,
    duration: '12 weeks',
    rating: 4.7,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'Data Science Overview', duration: '40:00', video_url: 'https://www.youtube.com/embed/ua-CiDNNj30', order_index: 1 },
      { title: 'NumPy Fundamentals', duration: '55:00', video_url: 'https://www.youtube.com/embed/QUT1VHiLmmI', order_index: 2 },
      { title: 'Pandas for Data Analysis', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/vmEHCJofslg', order_index: 3 },
      { title: 'Data Visualization', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/0P7QnIQDBJY', order_index: 4 },
      { title: 'Statistical Analysis', duration: '1:05:00', video_url: 'https://www.youtube.com/embed/xxpc-HPKN28', order_index: 5 },
      { title: 'Real-world Projects', duration: '1:20:00', video_url: 'https://www.youtube.com/embed/r-uOLxNrNk8', order_index: 6 }
    ]
  },
  {
    title: 'AWS Cloud Fundamentals',
    description: 'Learn cloud computing basics, AWS services, EC2, S3, Lambda, and deploy scalable applications.',
    category: 'Cloud Computing',
    level: 'Intermediate',
    isFree: true,
    duration: '8 weeks',
    rating: 4.8,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'Cloud Computing Basics', duration: '40:00', video_url: 'https://www.youtube.com/embed/M988_fsOSWo', order_index: 1 },
      { title: 'AWS Introduction', duration: '45:00', video_url: 'https://www.youtube.com/embed/ulprqHHWlng', order_index: 2 },
      { title: 'EC2 & Compute Services', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/SFLhB2G4VdU', order_index: 3 },
      { title: 'S3 Storage', duration: '50:00', video_url: 'https://www.youtube.com/embed/77lMCiiMilo', order_index: 4 },
      { title: 'Lambda & Serverless', duration: '55:00', video_url: 'https://www.youtube.com/embed/eOBq__h4OJ4', order_index: 5 },
      { title: 'Database Services', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/eMzCI7S05Qg', order_index: 6 }
    ]
  },
  {
    title: 'UI/UX Design Basics',
    description: 'Learn user interface and user experience design principles, wireframing, prototyping, and Figma.',
    category: 'Design',
    level: 'Beginner',
    isFree: true,
    duration: '6 weeks',
    rating: 4.7,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'UI/UX Introduction', duration: '35:00', video_url: 'https://www.youtube.com/embed/c9Wg6Cb_YlU', order_index: 1 },
      { title: 'Design Principles', duration: '50:00', video_url: 'https://www.youtube.com/embed/a5KYlHNKQB8', order_index: 2 },
      { title: 'User Research', duration: '45:00', video_url: 'https://www.youtube.com/embed/WpzmOH0hrEM', order_index: 3 },
      { title: 'Wireframing', duration: '55:00', video_url: 'https://www.youtube.com/embed/qpH7-KFWZRI', order_index: 4 },
      { title: 'Prototyping with Figma', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/FTFaQWZBqQ8', order_index: 5 },
      { title: 'Usability Testing', duration: '40:00', video_url: 'https://www.youtube.com/embed/BrVnBdW4Zu4', order_index: 6 }
    ]
  },
  {
    title: 'Java Programming Mastery',
    description: 'Complete Java course covering OOP, collections, multithreading, and enterprise applications.',
    category: 'Programming',
    level: 'Intermediate',
    isFree: true,
    duration: '12 weeks',
    rating: 4.6,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'Java Fundamentals', duration: '50:00', video_url: 'https://www.youtube.com/embed/eIrMbAQSU34', order_index: 1 },
      { title: 'Object-Oriented Programming', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/6T_HgnjoYwM', order_index: 2 },
      { title: 'Collections Framework', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/9h8gVDKuGAg', order_index: 3 },
      { title: 'Exception Handling', duration: '45:00', video_url: 'https://www.youtube.com/embed/1XAfapkBQjk', order_index: 4 },
      { title: 'Multithreading', duration: '1:15:00', video_url: 'https://www.youtube.com/embed/TCd8QIS-2KI', order_index: 5 },
      { title: 'JDBC & Databases', duration: '1:05:00', video_url: 'https://www.youtube.com/embed/7v2OnUti2eM', order_index: 6 }
    ]
  },
  {
    title: 'System Design Basics',
    description: 'Learn how to design scalable systems, understand architecture patterns, and prepare for system design interviews.',
    category: 'Computer Science',
    level: 'Advanced',
    isFree: true,
    duration: '8 weeks',
    rating: 4.9,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'System Design Introduction', duration: '40:00', video_url: 'https://www.youtube.com/embed/UzLMhqg3_Wc', order_index: 1 },
      { title: 'Scalability Principles', duration: '55:00', video_url: 'https://www.youtube.com/embed/-W9F__D3oY4', order_index: 2 },
      { title: 'Database Design', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/cCpVJQXCpWs', order_index: 3 },
      { title: 'Caching Strategies', duration: '50:00', video_url: 'https://www.youtube.com/embed/U3RkDLtS7uY', order_index: 4 },
      { title: 'Load Balancing', duration: '45:00', video_url: 'https://www.youtube.com/embed/K0Ta65OqQkY', order_index: 5 },
      { title: 'Microservices Architecture', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/lL_j7ilk7rc', order_index: 6 }
    ]
  },
  {
    title: 'Advanced SQL & Optimization',
    description: 'Master complex SQL queries, query optimization, indexing strategies, and database performance tuning.',
    category: 'Database',
    level: 'Advanced',
    isFree: true,
    duration: '8 weeks',
    rating: 4.7,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'Advanced SQL Queries', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/g6WMcmmlXRs', order_index: 1 },
      { title: 'Window Functions', duration: '55:00', video_url: 'https://www.youtube.com/embed/H6OTMoXjNiM', order_index: 2 },
      { title: 'Query Optimization', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/BHwzDmr6d7s', order_index: 3 },
      { title: 'Index Strategies', duration: '50:00', video_url: 'https://www.youtube.com/embed/fsG1XaZEa78', order_index: 4 },
      { title: 'Performance Tuning', duration: '1:05:00', video_url: 'https://www.youtube.com/embed/8jiKGfJ4FYk', order_index: 5 }
    ]
  },
  {
    title: 'REST API Development',
    description: 'Build robust RESTful APIs with Node.js, Express, authentication, validation, and best practices.',
    category: 'Backend Development',
    level: 'Intermediate',
    isFree: true,
    duration: '6 weeks',
    rating: 4.8,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'REST API Fundamentals', duration: '45:00', video_url: 'https://www.youtube.com/embed/-MTSQjw5DrM', order_index: 1 },
      { title: 'Express & Middleware', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/L72fhGm1tfE', order_index: 2 },
      { title: 'Authentication & JWT', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/mbsmsi7l3r4', order_index: 3 },
      { title: 'Validation & Error Handling', duration: '50:00', video_url: 'https://www.youtube.com/embed/lY6icfhap2o', order_index: 4 },
      { title: 'API Documentation', duration: '40:00', video_url: 'https://www.youtube.com/embed/S8kmHtQeflo', order_index: 5 }
    ]
  },
  {
    title: 'Communication Skills for Interviews',
    description: 'Develop effective communication skills, interview techniques, and professional presentation abilities.',
    category: 'Soft Skills',
    level: 'Beginner',
    isFree: true,
    duration: '4 weeks',
    rating: 4.5,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1560439514-4e9645039924?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'Communication Basics', duration: '35:00', video_url: 'https://www.youtube.com/embed/_DGdDkVfFUQ', order_index: 1 },
      { title: 'Interview Preparation', duration: '50:00', video_url: 'https://www.youtube.com/embed/HG68Ymazo18', order_index: 2 },
      { title: 'Body Language', duration: '40:00', video_url: 'https://www.youtube.com/embed/6s-hcm00TZs', order_index: 3 },
      { title: 'Technical Interviews', duration: '55:00', video_url: 'https://www.youtube.com/embed/XKu_SEDAykw', order_index: 4 },
      { title: 'Presentation Skills', duration: '45:00', video_url: 'https://www.youtube.com/embed/Iwpi1Lm6dFo', order_index: 5 }
    ]
  },
  {
    title: 'Placement Preparation Bootcamp',
    description: 'Complete bootcamp for campus placements covering aptitude, coding, HR questions, and resume building.',
    category: 'Career',
    level: 'Intermediate',
    isFree: true,
    duration: '10 weeks',
    rating: 4.8,
    status: 'published',
    thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
    lectures: [
      { title: 'Resume Building', duration: '40:00', video_url: 'https://www.youtube.com/embed/Tt08KmFfIYQ', order_index: 1 },
      { title: 'Aptitude & Logical Reasoning', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/gXsN1MWDEQM', order_index: 2 },
      { title: 'Coding Interview Prep', duration: '1:20:00', video_url: 'https://www.youtube.com/embed/8hly31xKli0', order_index: 3 },
      { title: 'HR Interview Questions', duration: '50:00', video_url: 'https://www.youtube.com/embed/7_aAicmPB3A', order_index: 4 },
      { title: 'Group Discussion', duration: '45:00', video_url: 'https://www.youtube.com/embed/4CfVRIp6Rrc', order_index: 5 }
    ]
  }
];

async function seedCourses() {
  console.log('🌱 Starting course database seeding...\n');
  const client = await pool.connect();
  
  try {
    // Check if instructor exists
    console.log('👤 Checking for instructor user...');
    const instructorCheck = await client.query(
      "SELECT id, name, role FROM users WHERE role = 'instructor' ORDER BY id LIMIT 1"
    );
    
    if (instructorCheck.rows.length === 0) {
      console.log('❌ No instructor found! Please create an instructor user first.');
      console.log('💡 Run: node scripts/create-admin.js');
      return;
    }
    
    const instructor = instructorCheck.rows[0];
    console.log(`✅ Found instructor: ${instructor.name} (ID: ${instructor.id})\n`);
    
    let coursesInserted = 0;
    let lecturesInserted = 0;
    
    for (const courseData of coursesData) {
      try {
        // Insert course
        const courseResult = await client.query(
          `INSERT INTO courses (
            title, description, category, level, instructor_id, 
            thumbnail, duration, rating, status, is_free, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) 
          RETURNING id, title`,
          [
            courseData.title,
            courseData.description,
            courseData.category,
            courseData.level.toLowerCase(),
            instructor.id,
            courseData.thumbnail,
            courseData.duration,
            courseData.rating,
            courseData.status,
            true
          ]
        );
        
        const course = courseResult.rows[0];
        coursesInserted++;
        console.log(`✅ [${coursesInserted}/20] Created course: ${course.title}`);
        
        // Insert lectures for this course
        for (const lecture of courseData.lectures) {
          await client.query(
            `INSERT INTO lessons (
              course_id, title, content, video_url, order_index, created_at
            ) VALUES ($1, $2, $3, $4, $5, NOW())`,
            [
              course.id,
              lecture.title,
              `Duration: ${lecture.duration}`,
              lecture.video_url,
              lecture.order_index
            ]
          );
          lecturesInserted++;
        }
        console.log(`   📚 Added ${courseData.lectures.length} lectures`);
        
      } catch (err) {
        console.error(`❌ Error seeding course "${courseData.title}":`, err.message);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Seeding completed successfully!');
    console.log('='.repeat(50));
    console.log(`✅ Total courses created: ${coursesInserted}`);
    console.log(`✅ Total lectures created: ${lecturesInserted}`);
    console.log('='.repeat(50));
    
    // Show summary
    console.log('\n📊 Database Summary:');
    const summary = await client.query(`
      SELECT 
        c.category,
        COUNT(DISTINCT c.id) as course_count,
        COUNT(l.id) as lecture_count
      FROM courses c
      LEFT JOIN lessons l ON l.course_id = c.id
      GROUP BY c.category
      ORDER BY course_count DESC
    `);
    
    console.log('\n📚 Courses by Category:');
    summary.rows.forEach(row => {
      console.log(`   ${row.category}: ${row.course_count} courses, ${row.lecture_count} lectures`);
    });
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('Stack:', error.stack);
    process.exitCode = 1;
  } finally {
    client.release();
    pool.end();
  }
}

// Run the seeder
if (require.main === module) {
  seedCourses();
}

module.exports = { seedCourses, coursesData };

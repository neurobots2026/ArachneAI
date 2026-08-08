export const programCatalog = [
  {
    name: 'Computer Science',
    degree: 'B.S.',
    category: 'Science & Technology',
    duration: '4 years',
    description: 'Build thoughtful software and study artificial intelligence, cybersecurity, data systems, and human-centered computing.',
    detail: 'Small lab sections, a senior studio, and paid regional internships connect foundational theory to public-interest technology.',
  },
  {
    name: 'Business Administration',
    degree: 'B.B.A.',
    category: 'Business & Leadership',
    duration: '4 years',
    description: 'Study finance, marketing, entrepreneurship, and responsible management through project-based courses.',
    detail: 'Student teams advise local organizations and build an investment or venture portfolio before graduation.',
  },
  {
    name: 'Nursing',
    degree: 'B.S.N.',
    category: 'Health Sciences',
    duration: '4 years',
    description: 'Prepare for compassionate clinical practice through simulation, community health, and hospital rotations.',
    detail: 'Clinical partnerships begin in the second year and culminate in a supervised senior practicum.',
  },
  {
    name: 'Psychology',
    degree: 'B.A.',
    category: 'Social Sciences',
    duration: '4 years',
    description: 'Explore cognition, behavior, development, and social systems in a research-focused curriculum.',
    detail: 'Every student develops an original question with a faculty mentor and presents at the spring research forum.',
  },
  {
    name: 'Environmental Science',
    degree: 'B.S.',
    category: 'Science & Technology',
    duration: '4 years',
    description: 'Study ecosystems, climate resilience, and environmental policy in our lake and forest field sites.',
    detail: 'Field methods, GIS, and community partnerships prepare graduates for conservation and policy work.',
  },
  {
    name: 'Education',
    degree: 'B.A.',
    category: 'Education & Community',
    duration: '4 years',
    description: 'Become a reflective educator through classroom practice, inclusive pedagogy, and community partnership.',
    detail: 'Progressive placements in Northbridge schools lead to a full-semester teaching residency.',
  },
  {
    name: 'Biology',
    degree: 'B.S.',
    category: 'Science & Technology',
    duration: '4 years',
    description: 'Investigate living systems from molecules to landscapes in collaborative, equipment-rich laboratories.',
    detail: 'Choose concentrations in molecular biology, ecology, or pre-health and complete an independent capstone.',
  },
  {
    name: 'English',
    degree: 'B.A.',
    category: 'Arts & Humanities',
    duration: '4 years',
    description: 'Read across cultures, write with purpose, and practice criticism, storytelling, and public communication.',
    detail: 'Editorial internships and the student literary review turn close reading into professional experience.',
  },
];

export const newsFallback = [
  {
    title: 'Spring enrollment opens March 1',
    date: '2026-02-15',
    summary: 'Students can meet with advisers now to prepare schedules and request priority courses.',
    category: 'Campus update',
  },
  {
    title: 'Crestwood recognized among leading regional colleges',
    date: '2026-01-28',
    summary: 'The college was recognized for teaching quality, student outcomes, and access to STEM research.',
    category: 'College news',
  },
  {
    title: 'Campus sustainability initiative enters its next phase',
    date: '2026-01-10',
    summary: 'New solar installations and a student-led energy audit move Crestwood toward its 2035 goals.',
    category: 'Sustainability',
  },
];

export const facultyDirectory = [
  {
    name: 'Dr. Maya Chen',
    initials: 'MC',
    title: 'Associate Professor of Computer Science',
    department: 'Science & Technology',
    interests: 'Human-centered AI, trustworthy systems, computing education',
    office: 'Alden Hall 312',
  },
  {
    name: 'Prof. Elena Martinez',
    initials: 'EM',
    title: 'Director of Cybersecurity Studies',
    department: 'Science & Technology',
    interests: 'Application security, digital ethics, resilient infrastructure',
    office: 'Alden Hall 220',
  },
  {
    name: 'Dr. Marcus Thompson',
    initials: 'MT',
    title: 'Professor of Management',
    department: 'Business & Leadership',
    interests: 'Social enterprise, organizational culture, regional economies',
    office: 'Whitmore 108',
  },
  {
    name: 'Prof. Amina Davis',
    initials: 'AD',
    title: 'Assistant Professor of Nursing',
    department: 'Health Sciences',
    interests: 'Community care, health equity, clinical simulation',
    office: 'Rowan Health 204',
  },
  {
    name: 'Dr. Samuel Anderson',
    initials: 'SA',
    title: 'Professor of Psychology',
    department: 'Social Sciences',
    interests: 'Learning and memory, adolescent development, research methods',
    office: 'Bell House 14',
  },
  {
    name: 'Dr. Evelyn Foster',
    initials: 'EF',
    title: 'Associate Professor of English',
    department: 'Arts & Humanities',
    interests: 'Public humanities, contemporary fiction, community publishing',
    office: 'Founders Hall 307',
  },
];

export const campusEvents = [
  { month: 'MAR', day: '07', title: 'Spring Open House', meta: '10:00 a.m. · Founders Green' },
  { month: 'MAR', day: '12', title: 'Student Research Forum', meta: '4:00 p.m. · Alden Science Center' },
  { month: 'MAR', day: '21', title: 'Crestwood Chamber Concert', meta: '7:30 p.m. · Hartwell Auditorium' },
];

export const portalAnnouncements = [
  'Fall advising appointments are now available through March 18.',
  'The library will remain open until midnight during midterm week.',
  'Applications for summer community research grants close April 4.',
];

export const assignmentCatalog = [
  { course: 'CS-101', title: 'Data structures reflection', due: 'March 14', status: 'Open' },
  { course: 'ENG-102', title: 'Research proposal', due: 'March 19', status: 'Open' },
  { course: 'MATH-201', title: 'Problem set 6', due: 'March 22', status: 'Upcoming' },
];

export const developerResources = [
  {
    eyebrow: 'Design system',
    title: 'Crestwood Campus UI',
    description: 'Accessible interface patterns and design tokens for approved campus applications.',
    meta: 'Version 2.4.1 · Maintained by Digital Experience',
  },
  {
    eyebrow: 'Identity',
    title: 'Campus SSO integration',
    description: 'OAuth onboarding guidance for applications that use Crestwood student and staff identity.',
    meta: 'Approval required · Review window: 3–5 days',
  },
  {
    eyebrow: 'Data services',
    title: 'Academic catalog API',
    description: 'Read-only course and program data for sanctioned advising and departmental tools.',
    meta: 'REST · JSON · Nightly refresh',
  },
];

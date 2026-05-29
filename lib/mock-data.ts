// Mock data for Navis prototype

export type Profile = {
  id: string;
  name: string;
  avatar: string;
  university: string;
  course: string;
  year: string;
  targetRole: string;
  careerScore: number;
  scoreHistory: { date: string; score: number }[];
  scoreBreakdown: {
    completeness: number;
    actionImpact: number;
    marketFit: number;
    clarity: number;
    relevance: number;
  };
  strengths: string[];
  gaps: string[];
  cvs: CV[];
  surveyData: SurveyData;
  mentorConversations: MentorConversation[];
  recentActivity: Activity[];
  nextActions: NextAction[];
};

export type CV = {
  id: string;
  version: number;
  uploadDate: string;
  score: number;
  targetRole: string;
  status: "active" | "archived";
  evaluation: {
    scoreBreakdown: {
      completeness: number;
      actionImpact: number;
      marketFit: number;
      clarity: number;
      relevance: number;
    };
    strengths: string[];
    improvements: { area: string; suggestion: string }[];
  };
  roleMatch: {
    matchScore: number;
    skillsRequired: { skill: string; level: "required" | "preferred"; has: boolean }[];
    prioritizedGaps: string[];
  };
  parsedData: {
    name: string;
    email: string;
    phone: string;
    experiences: { title: string; company: string; duration: string; description: string }[];
    education: { degree: string; institution: string; year: string }[];
    skills: string[];
  };
};

export type SurveyData = {
  education: {
    university: string;
    course: string;
    year: string;
    gpa?: string;
  };
  industryInterests: string[];
  careerGoals: {
    oneYear: string;
    threeYear: string;
    avoid: string;
  };
  constraints: {
    geographic: string[];
    weeklyHours: number;
    budget: string;
  };
  preferences: {
    companySize: string[];
    workLanguage: string[];
    workStyle: string;
  };
};

export type MentorConversation = {
  id: string;
  label: string;
  date: string;
  isBookmarked: boolean;
  messages: { role: "user" | "mentor"; content: string; timestamp: string }[];
};

export type Activity = {
  id: string;
  type: "cv_upload" | "mentor_chat" | "profile_update" | "score_change";
  description: string;
  date: string;
};

export type NextAction = {
  id: string;
  type: "learning" | "skill" | "mentor";
  title: string;
  description: string;
  cta: string;
  link: string;
};

export const profiles: Profile[] = [
  {
    id: "marco",
    name: "Marco Rossi",
    avatar: "MR",
    university: "Politecnico di Milano",
    course: "Computer Engineering",
    year: "3rd year",
    targetRole: "Data Analyst",
    careerScore: 72,
    scoreHistory: [
      { date: "Jan 2026", score: 58 },
      { date: "Feb 2026", score: 63 },
      { date: "Mar 2026", score: 68 },
      { date: "Apr 2026", score: 72 },
    ],
    scoreBreakdown: {
      completeness: 78,
      actionImpact: 65,
      marketFit: 75,
      clarity: 72,
      relevance: 70,
    },
    strengths: [
      "Strong technical foundation in Python and SQL",
      "Relevant internship experience at Accenture",
      "Quantified achievements in project descriptions",
    ],
    gaps: [
      "Missing Tableau/Power BI experience",
      "No certifications in data analytics",
      "Limited industry-specific projects",
    ],
    cvs: [
      {
        id: "cv-marco-3",
        version: 3,
        uploadDate: "Apr 15, 2026",
        score: 72,
        targetRole: "Data Analyst",
        status: "active",
        evaluation: {
          scoreBreakdown: {
            completeness: 78,
            actionImpact: 65,
            marketFit: 75,
            clarity: 72,
            relevance: 70,
          },
          strengths: [
            "Clear career objective aligned with target role",
            "Quantified impact in internship descriptions",
            "Strong educational background from top university",
          ],
          improvements: [
            { area: "Technical Skills", suggestion: "Add visualization tools like Tableau or Power BI to demonstrate full-stack analytics capability" },
            { area: "Projects", suggestion: "Include a personal data project with real-world dataset to show initiative" },
            { area: "Certifications", suggestion: "Consider Google Data Analytics or IBM Data Science certification" },
          ],
        },
        roleMatch: {
          matchScore: 75,
          skillsRequired: [
            { skill: "SQL", level: "required", has: true },
            { skill: "Python", level: "required", has: true },
            { skill: "Excel", level: "required", has: true },
            { skill: "Tableau", level: "required", has: false },
            { skill: "Statistics", level: "required", has: true },
            { skill: "Power BI", level: "preferred", has: false },
            { skill: "R", level: "preferred", has: false },
            { skill: "Machine Learning", level: "preferred", has: true },
          ],
          prioritizedGaps: ["Tableau", "Power BI", "Business Intelligence reporting"],
        },
        parsedData: {
          name: "Marco Rossi",
          email: "marco.rossi@mail.polimi.it",
          phone: "+39 333 456 7890",
          experiences: [
            {
              title: "Data Analyst Intern",
              company: "Accenture Italy",
              duration: "Jun 2025 - Sep 2025",
              description: "Analyzed customer data for retail clients, built automated reports reducing manual work by 40%",
            },
            {
              title: "Teaching Assistant",
              company: "Politecnico di Milano",
              duration: "Sep 2024 - Present",
              description: "Supporting Databases course, helping 120+ students with SQL and data modeling concepts",
            },
          ],
          education: [
            {
              degree: "BSc Computer Engineering",
              institution: "Politecnico di Milano",
              year: "2023 - 2026 (Expected)",
            },
          ],
          skills: ["Python", "SQL", "Excel", "Statistics", "Machine Learning", "Pandas", "NumPy"],
        },
      },
      {
        id: "cv-marco-2",
        version: 2,
        uploadDate: "Mar 10, 2026",
        score: 68,
        targetRole: "Data Analyst",
        status: "archived",
        evaluation: {
          scoreBreakdown: {
            completeness: 72,
            actionImpact: 60,
            marketFit: 70,
            clarity: 68,
            relevance: 70,
          },
          strengths: [
            "Good technical skill coverage",
            "Clear educational background",
          ],
          improvements: [
            { area: "Experience", suggestion: "Add more details about internship achievements" },
            { area: "Skills", suggestion: "Include more analytics-specific tools" },
          ],
        },
        roleMatch: {
          matchScore: 68,
          skillsRequired: [
            { skill: "SQL", level: "required", has: true },
            { skill: "Python", level: "required", has: true },
            { skill: "Excel", level: "required", has: true },
            { skill: "Tableau", level: "required", has: false },
            { skill: "Statistics", level: "required", has: true },
          ],
          prioritizedGaps: ["Tableau", "Quantified achievements"],
        },
        parsedData: {
          name: "Marco Rossi",
          email: "marco.rossi@mail.polimi.it",
          phone: "+39 333 456 7890",
          experiences: [
            {
              title: "Data Analyst Intern",
              company: "Accenture Italy",
              duration: "Jun 2025 - Sep 2025",
              description: "Worked on customer data analysis projects",
            },
          ],
          education: [
            {
              degree: "BSc Computer Engineering",
              institution: "Politecnico di Milano",
              year: "2023 - 2026 (Expected)",
            },
          ],
          skills: ["Python", "SQL", "Excel", "Statistics"],
        },
      },
      {
        id: "cv-marco-1",
        version: 1,
        uploadDate: "Jan 20, 2026",
        score: 58,
        targetRole: "Data Analyst",
        status: "archived",
        evaluation: {
          scoreBreakdown: {
            completeness: 55,
            actionImpact: 50,
            marketFit: 60,
            clarity: 62,
            relevance: 63,
          },
          strengths: ["Basic technical skills listed"],
          improvements: [
            { area: "Overall", suggestion: "CV needs more structure and detail" },
          ],
        },
        roleMatch: {
          matchScore: 55,
          skillsRequired: [
            { skill: "SQL", level: "required", has: true },
            { skill: "Python", level: "required", has: true },
          ],
          prioritizedGaps: ["Most skills need to be added"],
        },
        parsedData: {
          name: "Marco Rossi",
          email: "marco.rossi@mail.polimi.it",
          phone: "+39 333 456 7890",
          experiences: [],
          education: [
            {
              degree: "BSc Computer Engineering",
              institution: "Politecnico di Milano",
              year: "2023 - 2026",
            },
          ],
          skills: ["Python", "SQL"],
        },
      },
    ],
    surveyData: {
      education: {
        university: "Politecnico di Milano",
        course: "Computer Engineering",
        year: "3rd year",
        gpa: "27.5/30",
      },
      industryInterests: ["Tech", "Finance", "Consulting"],
      careerGoals: {
        oneYear: "Land a Data Analyst role at a tech company or consultancy in Milan",
        threeYear: "Become a Senior Data Analyst or transition into Data Science, potentially leading small analytics projects",
        avoid: "Pure software development roles without data focus, sales positions",
      },
      constraints: {
        geographic: ["Milan", "Remote (Italy)"],
        weeklyHours: 15,
        budget: "€200/month for courses",
      },
      preferences: {
        companySize: ["Large Enterprise", "Scale-up"],
        workLanguage: ["Italian", "English"],
        workStyle: "Hybrid",
      },
    },
    mentorConversations: [
      {
        id: "conv-1",
        label: "TIM interview prep",
        date: "Today",
        isBookmarked: true,
        messages: [
          {
            role: "mentor",
            content: "Hey Marco, I noticed a new Data Analyst opening at TIM that matches 6 of your 8 target skills — want to talk about it?",
            timestamp: "10:30 AM",
          },
          {
            role: "user",
            content: "Yes! I saw it too. What should I focus on in my preparation?",
            timestamp: "10:32 AM",
          },
          {
            role: "mentor",
            content: "Great question! Based on your profile and the job requirements, I&apos;d focus on three areas:\n\n1. **SQL proficiency** - They emphasize complex queries. Practice window functions and CTEs.\n\n2. **Business storytelling** - TIM values analysts who can translate data into business insights. Prepare 2-3 examples from your Accenture internship.\n\n3. **Tableau basics** - Even though you don&apos;t have deep experience, showing you&apos;ve started learning it demonstrates initiative.\n\nWant me to suggest some specific practice problems?",
            timestamp: "10:33 AM",
          },
          {
            role: "user",
            content: "Yes please, especially for the SQL part",
            timestamp: "10:35 AM",
          },
          {
            role: "mentor",
            content: "Here are some SQL challenges similar to what TIM might ask:\n\n1. Calculate month-over-month subscriber growth using window functions\n2. Find the top 3 products by revenue per region using RANK()\n3. Write a recursive CTE to analyze customer journey paths\n\nI&apos;d recommend practicing on LeetCode&apos;s SQL section (medium difficulty) and DataLemur for interview-specific questions. Should I also prepare a mock case study about telecom customer churn?",
            timestamp: "10:36 AM",
          },
        ],
      },
      {
        id: "conv-2",
        label: "Should I switch majors?",
        date: "Yesterday",
        isBookmarked: true,
        messages: [
          {
            role: "user",
            content: "I&apos;ve been thinking... should I have chosen Data Science instead of Computer Engineering?",
            timestamp: "3:15 PM",
          },
          {
            role: "mentor",
            content: "That&apos;s a common question, and honestly, you&apos;re in a great position. Here&apos;s why:\n\nComputer Engineering gives you a **stronger foundation** in systems, algorithms, and programming — skills that many pure Data Science graduates lack. The data-specific knowledge (statistics, ML, visualization) can be learned through courses and projects.\n\nMany hiring managers actually prefer engineering backgrounds because they produce analysts who can:\n- Write production-quality code\n- Understand data infrastructure\n- Debug complex pipeline issues\n\nMy advice: stay in Computer Engineering but supplement with data-focused electives and certifications. You&apos;re building a unique hybrid profile.",
            timestamp: "3:18 PM",
          },
        ],
      },
      {
        id: "conv-3",
        label: "Q1 review",
        date: "This week",
        isBookmarked: false,
        messages: [
          {
            role: "mentor",
            content: "Time for your quarterly check-in! Your career score improved from 58 to 72 since January — that&apos;s excellent progress. The biggest improvements came from:\n\n- Adding your Accenture internship details (+8 points)\n- Quantifying your achievements (+4 points)\n- Expanding your skills section (+2 points)\n\nFor Q2, I&apos;d prioritize learning Tableau and targeting one certification. What do you think?",
            timestamp: "2:00 PM",
          },
        ],
      },
    ],
    recentActivity: [
      { id: "act-1", type: "cv_upload", description: "Uploaded CV v3", date: "Apr 15, 2026" },
      { id: "act-2", type: "mentor_chat", description: "Discussed TIM opportunity", date: "Today" },
      { id: "act-3", type: "score_change", description: "Career score increased to 72", date: "Apr 15, 2026" },
      { id: "act-4", type: "profile_update", description: "Updated career goals", date: "Apr 10, 2026" },
    ],
    nextActions: [
      {
        id: "action-1",
        type: "learning",
        title: "Complete Tableau Fundamentals",
        description: "Coursera course: 4 weeks, 3h/week. Fills your biggest skill gap.",
        cta: "Start Course",
        link: "/mentor",
      },
      {
        id: "action-2",
        type: "skill",
        title: "Build a Portfolio Project",
        description: "Create a customer segmentation analysis using a public dataset.",
        cta: "Get Guidance",
        link: "/mentor",
      },
      {
        id: "action-3",
        type: "mentor",
        title: "Prepare for TIM Interview",
        description: "Your mentor has specific prep materials ready for you.",
        cta: "Continue Chat",
        link: "/mentor",
      },
    ],
  },
  {
    id: "laura",
    name: "Laura Bianchi",
    avatar: "LB",
    university: "Bocconi University",
    course: "Economics",
    year: "Final year",
    targetRole: "Consulting",
    careerScore: 65,
    scoreHistory: [
      { date: "Apr 2026", score: 65 },
    ],
    scoreBreakdown: {
      completeness: 60,
      actionImpact: 58,
      marketFit: 70,
      clarity: 68,
      relevance: 69,
    },
    strengths: [
      "Prestigious university brand recognition",
      "Strong academic performance",
      "Relevant case competition experience",
    ],
    gaps: [
      "Limited work experience",
      "Missing quantified achievements",
      "No consulting-specific certifications",
    ],
    cvs: [
      {
        id: "cv-laura-1",
        version: 1,
        uploadDate: "Apr 20, 2026",
        score: 65,
        targetRole: "Management Consultant",
        status: "active",
        evaluation: {
          scoreBreakdown: {
            completeness: 60,
            actionImpact: 58,
            marketFit: 70,
            clarity: 68,
            relevance: 69,
          },
          strengths: [
            "Strong academic credentials from top business school",
            "Case competition achievements demonstrate problem-solving",
            "International exchange experience shows adaptability",
          ],
          improvements: [
            { area: "Work Experience", suggestion: "Add more detail about your part-time roles and their business impact" },
            { area: "Skills", suggestion: "Highlight Excel modeling and presentation skills more prominently" },
            { area: "Structure", suggestion: "Use the STAR format for experience descriptions" },
          ],
        },
        roleMatch: {
          matchScore: 68,
          skillsRequired: [
            { skill: "Excel", level: "required", has: true },
            { skill: "PowerPoint", level: "required", has: true },
            { skill: "Problem Solving", level: "required", has: true },
            { skill: "Financial Modeling", level: "required", has: false },
            { skill: "Data Analysis", level: "preferred", has: false },
            { skill: "SQL", level: "preferred", has: false },
          ],
          prioritizedGaps: ["Financial Modeling", "Data Analysis", "Case interview preparation"],
        },
        parsedData: {
          name: "Laura Bianchi",
          email: "laura.bianchi@studbocconi.it",
          phone: "+39 348 123 4567",
          experiences: [
            {
              title: "Marketing Assistant (Part-time)",
              company: "Luxottica",
              duration: "Sep 2025 - Present",
              description: "Supporting digital marketing campaigns and analyzing social media metrics",
            },
            {
              title: "Case Competition Finalist",
              company: "Bocconi Case Competition",
              duration: "Nov 2025",
              description: "Led team of 4 to develop market entry strategy for luxury brand; reached finals among 50+ teams",
            },
          ],
          education: [
            {
              degree: "BSc Economics and Management",
              institution: "Bocconi University",
              year: "2022 - 2026 (Expected)",
            },
            {
              degree: "Exchange Semester",
              institution: "HEC Paris",
              year: "Spring 2025",
            },
          ],
          skills: ["Excel", "PowerPoint", "Italian", "English", "French", "Strategic Thinking"],
        },
      },
    ],
    surveyData: {
      education: {
        university: "Bocconi University",
        course: "Economics and Management",
        year: "Final year",
        gpa: "29/30",
      },
      industryInterests: ["Consulting", "Finance", "Luxury"],
      careerGoals: {
        oneYear: "Join a top-tier consulting firm (MBB or Big 4) as an Analyst in Milan",
        threeYear: "Become a Consultant with expertise in luxury/retail sector, potentially pursue MBA",
        avoid: "Purely quantitative roles, back-office positions, startups with no structure",
      },
      constraints: {
        geographic: ["Milan", "London", "Paris"],
        weeklyHours: 20,
        budget: "€300/month for courses and materials",
      },
      preferences: {
        companySize: ["Large Enterprise"],
        workLanguage: ["Italian", "English", "French"],
        workStyle: "On-site",
      },
    },
    mentorConversations: [
      {
        id: "conv-laura-1",
        label: "Case interview prep",
        date: "Today",
        isBookmarked: true,
        messages: [
          {
            role: "mentor",
            content: "Welcome Laura! I see you just uploaded your first CV and you&apos;re targeting consulting. Let&apos;s talk about your preparation strategy. Have you started practicing case interviews yet?",
            timestamp: "2:00 PM",
          },
          {
            role: "user",
            content: "Not formally yet. I&apos;ve read Case in Point but haven&apos;t done mock interviews.",
            timestamp: "2:05 PM",
          },
          {
            role: "mentor",
            content: "Good foundation! Here&apos;s what I&apos;d recommend for the next 8 weeks:\n\n**Weeks 1-2:** Practice solo with basic frameworks (profitability, market entry, M&A)\n\n**Weeks 3-4:** Start peer practice — I can help you find partners from our community\n\n**Weeks 5-8:** Intensive mock interviews, aim for 2-3 per week\n\nYour Bocconi background and case competition experience are strong assets. Want me to create a detailed prep schedule?",
            timestamp: "2:08 PM",
          },
        ],
      },
      {
        id: "conv-laura-2",
        label: "CV review feedback",
        date: "Today",
        isBookmarked: false,
        messages: [
          {
            role: "mentor",
            content: "I&apos;ve analyzed your CV and here are the key opportunities:\n\n1. **Luxottica experience**: Add specific metrics — how many campaigns? What was the reach? Any conversion improvements?\n\n2. **Case competition**: Great that you reached finals! Add the business impact of your recommendations and any framework you developed.\n\n3. **HEC exchange**: Mention specific courses or projects relevant to consulting.\n\nThese changes could boost your score by 8-10 points. Should we work through them together?",
            timestamp: "3:30 PM",
          },
        ],
      },
    ],
    recentActivity: [
      { id: "act-l1", type: "cv_upload", description: "Uploaded first CV", date: "Apr 20, 2026" },
      { id: "act-l2", type: "profile_update", description: "Completed career survey", date: "Apr 20, 2026" },
      { id: "act-l3", type: "mentor_chat", description: "Started case prep discussion", date: "Today" },
    ],
    nextActions: [
      {
        id: "action-l1",
        type: "learning",
        title: "Complete Case Interview Fundamentals",
        description: "Victor Cheng&apos;s free video series on case interview prep. Essential foundation.",
        cta: "Start Learning",
        link: "/mentor",
      },
      {
        id: "action-l2",
        type: "skill",
        title: "Improve Your CV",
        description: "Apply the mentor&apos;s feedback to boost your score by 8-10 points.",
        cta: "View Suggestions",
        link: "/cvs",
      },
      {
        id: "action-l3",
        type: "mentor",
        title: "Schedule Mock Interview",
        description: "Practice makes perfect. Book your first peer mock session.",
        cta: "Get Started",
        link: "/mentor",
      },
    ],
  },
  {
    id: "giulia",
    name: "Giulia Verdi",
    avatar: "GV",
    university: "Sapienza University of Rome",
    course: "Marketing",
    year: "Recent graduate",
    targetRole: "Digital Marketing",
    careerScore: 81,
    scoreHistory: [
      { date: "Nov 2025", score: 62 },
      { date: "Dec 2025", score: 70 },
      { date: "Jan 2026", score: 74 },
      { date: "Feb 2026", score: 77 },
      { date: "Mar 2026", score: 79 },
      { date: "Apr 2026", score: 81 },
    ],
    scoreBreakdown: {
      completeness: 85,
      actionImpact: 82,
      marketFit: 80,
      clarity: 78,
      relevance: 80,
    },
    strengths: [
      "Proven track record with multiple internships",
      "Strong portfolio of campaign results",
      "Google and Meta certifications completed",
    ],
    gaps: [
      "Limited B2B marketing experience",
      "Could strengthen analytics depth",
      "Leadership experience missing",
    ],
    cvs: [
      {
        id: "cv-giulia-2",
        version: 2,
        uploadDate: "Mar 28, 2026",
        score: 81,
        targetRole: "Digital Marketing Specialist",
        status: "active",
        evaluation: {
          scoreBreakdown: {
            completeness: 85,
            actionImpact: 82,
            marketFit: 80,
            clarity: 78,
            relevance: 80,
          },
          strengths: [
            "Excellent quantified achievements throughout",
            "Relevant certifications demonstrate commitment",
            "Progressive experience shows growth trajectory",
          ],
          improvements: [
            { area: "B2B Experience", suggestion: "Consider freelance projects for B2B clients to diversify portfolio" },
            { area: "Analytics", suggestion: "Add Google Analytics 4 certification to strengthen data skills" },
            { area: "Leadership", suggestion: "Highlight any team coordination or mentoring experiences" },
          ],
        },
        roleMatch: {
          matchScore: 83,
          skillsRequired: [
            { skill: "Social Media Marketing", level: "required", has: true },
            { skill: "Google Ads", level: "required", has: true },
            { skill: "Content Creation", level: "required", has: true },
            { skill: "Analytics", level: "required", has: true },
            { skill: "SEO", level: "required", has: true },
            { skill: "Meta Ads", level: "preferred", has: true },
            { skill: "Email Marketing", level: "preferred", has: true },
            { skill: "CRM", level: "preferred", has: false },
          ],
          prioritizedGaps: ["CRM platforms (HubSpot/Salesforce)", "Marketing automation"],
        },
        parsedData: {
          name: "Giulia Verdi",
          email: "giulia.verdi@gmail.com",
          phone: "+39 329 876 5432",
          experiences: [
            {
              title: "Digital Marketing Intern",
              company: "Ferrero",
              duration: "Jan 2026 - Apr 2026",
              description: "Managed social media for Nutella Italy (+15% engagement). Led influencer campaign reaching 2M impressions.",
            },
            {
              title: "Social Media Manager",
              company: "Rome Fashion Week",
              duration: "Sep 2025 - Dec 2025",
              description: "Grew Instagram following from 5K to 18K. Created content strategy generating €50K in ticket sales.",
            },
            {
              title: "Marketing Assistant",
              company: "Startup Village Roma",
              duration: "Mar 2025 - Aug 2025",
              description: "Executed email campaigns with 35% open rate. Managed Google Ads with 4.2 ROAS.",
            },
          ],
          education: [
            {
              degree: "BA Marketing and Communication",
              institution: "Sapienza University of Rome",
              year: "2022 - 2025",
            },
          ],
          skills: [
            "Social Media Marketing", "Google Ads", "Meta Ads", "Content Creation",
            "SEO", "Email Marketing", "Canva", "Analytics", "Italian", "English",
          ],
        },
      },
      {
        id: "cv-giulia-1",
        version: 1,
        uploadDate: "Nov 15, 2025",
        score: 62,
        targetRole: "Digital Marketing Specialist",
        status: "archived",
        evaluation: {
          scoreBreakdown: {
            completeness: 58,
            actionImpact: 55,
            marketFit: 65,
            clarity: 68,
            relevance: 64,
          },
          strengths: ["Clear interest in digital marketing"],
          improvements: [
            { area: "Experience", suggestion: "Add internship details as you complete them" },
            { area: "Skills", suggestion: "Get certified in Google/Meta ads" },
          ],
        },
        roleMatch: {
          matchScore: 60,
          skillsRequired: [
            { skill: "Social Media Marketing", level: "required", has: true },
            { skill: "Content Creation", level: "required", has: true },
          ],
          prioritizedGaps: ["Certifications", "Platform expertise", "Quantified results"],
        },
        parsedData: {
          name: "Giulia Verdi",
          email: "giulia.verdi@gmail.com",
          phone: "+39 329 876 5432",
          experiences: [],
          education: [
            {
              degree: "BA Marketing and Communication",
              institution: "Sapienza University of Rome",
              year: "2022 - 2025",
            },
          ],
          skills: ["Social Media", "Content Creation", "Italian", "English"],
        },
      },
    ],
    surveyData: {
      education: {
        university: "Sapienza University of Rome",
        course: "Marketing and Communication",
        year: "Graduated 2025",
        gpa: "110/110 cum laude",
      },
      industryInterests: ["Fashion", "Food & Beverage", "Tech", "Luxury"],
      careerGoals: {
        oneYear: "Secure a full-time Digital Marketing Specialist role at a major brand",
        threeYear: "Become Digital Marketing Manager, leading a small team and managing €500K+ annual budget",
        avoid: "Traditional advertising, print media, cold calling sales roles",
      },
      constraints: {
        geographic: ["Rome", "Milan", "Remote (Italy)"],
        weeklyHours: 8,
        budget: "€150/month for courses",
      },
      preferences: {
        companySize: ["Large Enterprise", "Scale-up", "Agency"],
        workLanguage: ["Italian", "English"],
        workStyle: "Hybrid",
      },
    },
    mentorConversations: [
      {
        id: "conv-giulia-1",
        label: "Ferrero interview debrief",
        date: "This week",
        isBookmarked: true,
        messages: [
          {
            role: "user",
            content: "My Ferrero internship just ended. They mentioned there might be a full-time position opening in June. How should I position myself?",
            timestamp: "11:00 AM",
          },
          {
            role: "mentor",
            content: "Congratulations on completing your internship! Based on your results (15% engagement increase, 2M impressions), you have a strong case. Here&apos;s your action plan:\n\n1. **Document everything**: Create a portfolio deck with your Ferrero results, including before/after metrics\n\n2. **Stay visible**: Connect with your manager and team on LinkedIn, engage with Ferrero&apos;s content\n\n3. **Express interest formally**: Send a thank-you email mentioning your interest in the full-time role\n\n4. **Backup plan**: Keep interviewing elsewhere — it creates urgency and gives you options\n\nWant me to help you draft that email to your manager?",
            timestamp: "11:05 AM",
          },
        ],
      },
      {
        id: "conv-giulia-2",
        label: "Salary negotiation tips",
        date: "This week",
        isBookmarked: true,
        messages: [
          {
            role: "user",
            content: "I have two offers now - one from an agency (€28K) and one from a mid-size brand (€26K but better learning). How do I decide?",
            timestamp: "4:30 PM",
          },
          {
            role: "mentor",
            content: "Great problem to have! Let me break this down:\n\n**Agency (€28K):**\n- Faster skill development (multiple clients)\n- Higher intensity, potential burnout\n- Good for portfolio building\n\n**Brand (€26K):**\n- Deeper understanding of one business\n- Usually better work-life balance\n- Stronger for long-term brand marketing career\n\nGiven your goal to become a Digital Marketing Manager at a major brand, the brand role might be more aligned — BUT €2K difference over a year is significant.\n\nHave you tried negotiating? The brand might match if you mention the other offer (tactfully).",
            timestamp: "4:35 PM",
          },
        ],
      },
      {
        id: "conv-giulia-3",
        label: "Learning path check-in",
        date: "Yesterday",
        isBookmarked: false,
        messages: [
          {
            role: "mentor",
            content: "Your career score hit 81 — you&apos;re in the top 15% of recent graduates! The main areas to strengthen now are:\n\n1. **B2B marketing** — Your experience is all B2C. Consider freelancing for a SaaS startup.\n2. **Analytics depth** — GA4 certification would round out your skill set.\n3. **Leadership** — Start positioning yourself to mentor newer team members.\n\nThese changes could push you to 90+ within 6 months.",
            timestamp: "10:00 AM",
          },
        ],
      },
    ],
    recentActivity: [
      { id: "act-g1", type: "score_change", description: "Career score reached 81", date: "Apr 1, 2026" },
      { id: "act-g2", type: "mentor_chat", description: "Discussed job offers", date: "This week" },
      { id: "act-g3", type: "cv_upload", description: "Updated CV with Ferrero results", date: "Mar 28, 2026" },
      { id: "act-g4", type: "profile_update", description: "Updated availability preferences", date: "Mar 25, 2026" },
    ],
    nextActions: [
      {
        id: "action-g1",
        type: "learning",
        title: "Get GA4 Certified",
        description: "Google Analytics 4 certification — free, 4-6 hours, boosts analytics credibility.",
        cta: "Start Certification",
        link: "/mentor",
      },
      {
        id: "action-g2",
        type: "skill",
        title: "Try B2B Marketing",
        description: "Your mentor can connect you with SaaS startups needing marketing help.",
        cta: "Explore Options",
        link: "/mentor",
      },
      {
        id: "action-g3",
        type: "mentor",
        title: "Finalize Job Decision",
        description: "You have two offers on the table. Let&apos;s decide together.",
        cta: "Continue Discussion",
        link: "/mentor",
      },
    ],
  },
];

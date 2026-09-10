import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FiTarget,
  FiBookOpen,
  FiLayers,
  FiArrowRight,
  FiCpu,
} from 'react-icons/fi'
import SplitText from '../Reactbits/SplitText'
import PixelBlast from '../Reactbits/pixelBlast'
import sessionPreview from '../assets/latestDashboard.png'

const FEATURES = [
  {
    icon: FiTarget,
    title: 'Precision Targeting',
    desc: 'Interview questions generated for your specific role and experience level. No generic padding.',
  },
  {
    icon: FiBookOpen,
    title: 'AI Logic Engine',
    desc: 'Instant, logical explanations for every answer with structured examples and code snippets.',
  },
  {
    icon: FiLayers,
    title: 'Session Mastery',
    desc: 'Organize your prep into distinct sessions. Pin critical concepts and track your growth.',
  },
  {
    icon: FiCpu,
    title: 'Deep Context',
    desc: 'AI that understands the technical nuances of your industry, providing high-fidelity feedback.',
  },
]

const STATS = [
  { value: '10K+', label: 'QUESTIONS' },
  { value: '95%',  label: 'ACCURACY'  },
  { value: '50+',  label: 'ROLES'     },
  { value: '2min', label: 'SETUP'     },
]

const sectionReveal = {
  hidden: { opacity: 0, y: 40 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
}

const staggerContainer = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
}

const itemReveal = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

const LandingPage = () => {
  const navigate = useNavigate()

  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black">

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden bg-black text-white">

        {/* NAV */}
        <nav className="relative z-20 border-b border-white/10">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-8 py-5 lg:px-12">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 bg-white" />
              {/* nav brand — +20% from text-sm → text-base */}
              <span className="text-base font-bold tracking-[0.3em] uppercase text-white">PrepAI</span>
            </div>

            <div className="hidden items-center gap-10 md:flex">
              {/* nav links — +20% from text-[10px] → text-xs */}
              <a href="#features" className="text-xs font-bold tracking-widest uppercase text-neutral-400 transition hover:text-white">Features</a>
              <a href="#results"  className="text-xs font-bold tracking-widest uppercase text-neutral-400 transition hover:text-white">Results</a>
              <button onClick={() => navigate('/login')} className="text-xs font-bold tracking-widest uppercase text-white">Sign In</button>
              <button onClick={() => navigate('/signup')} className="rounded-full bg-white px-5 py-2 text-xs font-bold tracking-widest uppercase text-black transition hover:bg-neutral-200">
                Get Started
              </button>
            </div>

            <button onClick={() => navigate('/signup')} className="md:hidden rounded-full bg-white px-4 py-2 text-xs font-bold uppercase text-black">
              Start
            </button>
          </div>
        </nav>

        {/* HERO GRID */}
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col border-x border-b border-white/10" style={{ minHeight: 'calc(100vh - 57px)' }}>

          {/* TOP ROW */}
          <div className="flex flex-1">

            {/* Headline cell */}
            <div className="flex w-full flex-col justify-center border-r border-white/10 px-8 py-16 lg:w-[48%] lg:px-12">
              {/* EXCLUDED from font bump — stays as-is */}
              <h1 className="font-extrabold leading-[1.04] tracking-tight"
                  style={{ fontSize: 'clamp(3rem, 6vw, 5.5rem)' }}>
                <SplitText
                  text="The intelligence behind the interview."
                  className="font-extrabold leading-[1.04] tracking-tight"
                  delay={20}
                  duration={0.75}
                  ease="power3.out"
                  splitType="chars"
                  from={{ opacity: 0, y: 50 }}
                  to={{ opacity: 1, y: 0 }}
                  threshold={0}
                  rootMargin="0px"
                  textAlign="left"
                  tag="span"
                />
              </h1>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                {/* buttons — +20% from text-[11px] → text-sm */}
                <button
                  onClick={() => navigate('/signup')}
                  className="rounded-full bg-white px-7 py-3 text-sm font-bold uppercase tracking-widest text-black transition hover:bg-neutral-200"
                >
                  Get Started
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="group flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-neutral-400 transition hover:text-white"
                >
                  Learn More
                  <FiArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>

            {/* Animation cell */}
            <div className="relative hidden flex-1 overflow-hidden lg:block">
              <PixelBlast
                variant="square"
                pixelSize={4}
                color="#B497CF"
                patternScale={4.25}
                patternDensity={1.3}
                pixelSizeJitter={0}
                enableRipples={false}
                rippleSpeed={0.4}
                rippleThickness={0.12}
                rippleIntensityScale={1.5}
                liquid={false}
                liquidStrength={0.12}
                liquidRadius={1.2}
                liquidWobbleSpeed={5}
                speed={0.9}
                edgeFade={0.25}
                transparent
              />
            </div>
          </div>

          {/* BOTTOM ROW — single border-t, perfectly straight */}
          <div className="flex w-full border-t border-white/10">

            {/* Description — left */}
            <div className="w-full border-r border-white/10 px-8 py-8 lg:w-[48%] lg:px-12">
              {/* +20% from text-base → text-lg */}
              <p className="max-w-sm text-lg font-medium leading-relaxed text-neutral-300">
                PrepAI helps you lock structure, questions, and flow before the interview lands — so you ship confidence on day one.
              </p>
            </div>

            {/* Stats — right, centred */}
            <div className="hidden flex-1 items-center justify-center gap-14 px-10 py-8 lg:flex">
              {[
                { label: 'Questions',  value: '10K+' },
                { label: 'Avg. Setup', value: '2 min' },
                { label: 'Roles',      value: '50+'   },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  {/* +20% from text-xs → text-sm */}
                  <p className="text-sm font-bold uppercase tracking-widest text-neutral-400">{s.label}</p>
                  {/* +20% from text-3xl → text-4xl */}
                  <p className="mt-1 text-4xl font-extrabold tracking-tight text-white">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          REST OF PAGE
      ══════════════════════════════════════════ */}
      <div className="bg-black text-white">
        <div className="mx-auto max-w-7xl px-8 lg:px-12">

          {/* FEATURE CARDS */}
          <section className="py-20 lg:py-28">
            {/* +20% from text-3xl → text-4xl */}
            <h2 className="mb-10 text-4xl font-extrabold tracking-tight sm:text-5xl">
              A prep system, not a practice list
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: 'Skip the blank canvas',
                  desc:  'Questions, difficulty levels, and focus areas are generated before you write a single answer.',
                },
                {
                  title: 'Designed to be tested',
                  desc:  'Every session doubles as a test — MCQ or descriptive, scored the moment you finish.',
                },
                {
                  title: 'Stays out of your way',
                  desc:  'No proprietary flow, no lock-in — just questions, answers, and honest AI feedback.',
                },
              ].map((card) => (
                <motion.div
                  key={card.title}
                  className="group relative flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-7 transition hover:border-neutral-600"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <div className="absolute right-5 top-5 text-neutral-600 transition group-hover:text-neutral-300">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <line x1="7" y1="0" x2="7" y2="14" stroke="currentColor" strokeWidth="1.5"/>
                      <line x1="0" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  {/* +20% from text-sm → text-base */}
                  <p className="text-base font-bold tracking-tight text-white">{card.title} →</p>
                  <div className="mt-16" />
                  {/* +20% from text-[12px] → text-sm */}
                  <p className="text-sm leading-relaxed text-neutral-400">{card.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <div className="h-px bg-neutral-800" />

          {/* STATS */}
          <motion.section
            id="results"
            className="grid grid-cols-2 gap-y-12 py-20 md:grid-cols-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
          >
            {STATS.map((stat) => (
              <motion.div key={stat.label} className="text-center" variants={itemReveal}>
                {/* +20% from text-5xl → text-6xl */}
                <p className="text-5xl font-bold tracking-tighter sm:text-6xl">{stat.value}</p>
                {/* +20% from text-[10px] → text-xs */}
                <p className="mt-2 text-xs font-bold tracking-[0.2em] text-neutral-500">{stat.label}</p>
              </motion.div>
            ))}
          </motion.section>

          <div className="h-px bg-neutral-800" />

          {/* FEATURES */}
          <motion.section
            id="features"
            className="py-24 lg:py-36"
            variants={sectionReveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
          >
            <div className="grid gap-x-16 gap-y-20 lg:grid-cols-12">
              <motion.div className="lg:col-span-4" variants={itemReveal}>
                {/* +20% from text-[10px] → text-xs */}
                <span className="text-xs font-bold tracking-widest uppercase text-neutral-500">Core Capabilities</span>
                {/* +20% from text-4xl → text-5xl */}
                <h2 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                  Engineered for precision.
                </h2>
                {/* +20% from text-[12px] → text-sm */}
                <p className="mt-6 text-sm leading-relaxed text-neutral-400">
                  We replaced generic practice with a structured intelligence layer that adapts to your role and experience.
                </p>
              </motion.div>

              <motion.div
                className="lg:col-span-8"
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
              >
                <div className="grid gap-10 sm:grid-cols-2">
                  {FEATURES.map((feat) => {
                    const Icon = feat.icon
                    return (
                      <motion.article key={feat.title} className="group" variants={itemReveal}>
                        <div className="mb-5 flex items-center gap-4">
                          <div className="h-px w-8 bg-neutral-600" />
                          <Icon size={18} className="text-neutral-400" />
                        </div>
                        {/* +20% from text-sm → text-base */}
                        <h3 className="text-base font-bold tracking-tight text-white">{feat.title}</h3>
                        {/* +20% from text-[12px] → text-sm */}
                        <p className="mt-3 text-sm leading-relaxed text-neutral-400">{feat.desc}</p>
                      </motion.article>
                    )
                  })}
                </div>
              </motion.div>
            </div>
          </motion.section>

          <div className="h-px bg-neutral-800" />

          {/* PRODUCT SCREENSHOT */}
          <motion.section
            className="py-24 lg:py-36"
            variants={sectionReveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <div className="mb-12">
              {/* +20% from text-[10px] → text-xs */}
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Live Interface</span>
              {/* +20% from text-4xl → text-5xl */}
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Inside the prep workspace</h2>
            </div>

            <motion.div
              className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950"
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <div className="flex items-center gap-2.5 border-b border-neutral-800 bg-neutral-900 px-5 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                {/* +20% from text-[11px] → text-sm */}
                <div className="ml-2 flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-500">
                  prepai.app/session-preview
                </div>
              </div>
              <div className="relative bg-black p-3 sm:p-4">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_50%)]" />
                <motion.img
                  src={sessionPreview}
                  alt="PrepAI dashboard preview"
                  className="relative z-10 w-full rounded-xl border border-white/10 object-cover"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.25 }}
                />
              </div>
            </motion.div>
          </motion.section>

          <div className="h-px bg-neutral-800" />

          {/* CTA */}
          <motion.section
            className="py-24 lg:py-36"
            variants={sectionReveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
          >
            {/* +20% from text-6xl → text-7xl */}
            <h2 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              Ready to start?
            </h2>
            {/* +20% from text-[12px] → text-sm */}
            <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-400">
              Create a session in under 2 minutes. AI generates the questions — you focus on the answers.
            </p>
            <div className="mt-10 flex items-center gap-5">
              {/* +20% from text-[11px] → text-sm */}
              <button
                onClick={() => navigate('/signup')}
                className="rounded-full bg-white px-8 py-3 text-sm font-bold uppercase tracking-widest text-black transition hover:bg-neutral-200"
              >
                Create Account
              </button>
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-bold uppercase tracking-widest text-neutral-400 transition hover:text-white"
              >
                Sign In →
              </button>
            </div>
          </motion.section>

          {/* FOOTER */}
          <motion.footer
            className="flex flex-col items-center justify-between gap-6 border-t border-neutral-800 py-10 md:flex-row"
            variants={sectionReveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
          >
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 bg-white" />
              {/* +20% from text-[10px] → text-xs */}
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400">PrepAI © 2026</span>
            </div>
            <div className="flex gap-8">
              <a href="#" className="text-xs font-bold tracking-widest uppercase text-neutral-500 transition hover:text-white">Privacy</a>
              <a href="#" className="text-xs font-bold tracking-widest uppercase text-neutral-500 transition hover:text-white">Terms</a>
            </div>
          </motion.footer>

        </div>
      </div>
    </main>
  )
}

export default LandingPage

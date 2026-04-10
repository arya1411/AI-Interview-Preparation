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
import Beams from '../Reactbits/Beams'
import sessionPreview from '../assets/dashboard.png'

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
  { value: '95%', label: 'ACCURACY' },
  { value: '50+', label: 'ROLES' },
  { value: '2min', label: 'SETUP' },
]

const sectionReveal = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
}

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
}

const itemReveal = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: 'easeOut' },
  },
}

const LandingPage = () => {
  const navigate = useNavigate()

  return (
    <main className="claude-home min-h-screen bg-white text-black selection:bg-black selection:text-white dark:bg-neutral-950 dark:text-white dark:selection:bg-white dark:selection:text-black">
      {/* ── TOP SECTION (nav + hero with continuous Beams background) ── */}
      <section className="relative flex min-h-screen w-full flex-col overflow-hidden bg-black text-white">
        {/* Three.js Beams background */}
        <div className="pointer-events-none absolute inset-0">
          <Beams
            beamWidth={3}
            beamHeight={30}
            beamNumber={20}
            lightColor="#ffffff"
            speed={2}
            noiseIntensity={1.75}
            scale={0.2}
            rotation={30}
          />
        </div>

        {/* ── NAVIGATION ── */}
        <nav className="relative z-10 mx-auto w-full max-w-7xl px-8 lg:px-12">
          <div className="flex items-center justify-between border-b border-white/10 py-8">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 bg-white" />
              <span className="text-sm font-bold tracking-[0.3em] uppercase text-white">PrepAI</span>
            </div>

            <div className="hidden items-center gap-10 md:flex">
              <a href="#features" className="text-[10px] font-bold tracking-widest uppercase text-neutral-400 transition hover:text-white">
                Features
              </a>
              <a href="#results" className="text-[10px] font-bold tracking-widest uppercase text-neutral-400 transition hover:text-white">
                Results
              </a>
              <button
                onClick={() => navigate('/login')}
                className="text-[10px] font-bold tracking-widest uppercase text-white"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="bg-white px-6 py-2 text-[10px] font-bold tracking-widest uppercase text-black transition hover:bg-neutral-200"
              >
                Get Started
              </button>
            </div>

            <button
              onClick={() => navigate('/signup')}
              className="md:hidden bg-white px-4 py-2 text-[10px] font-bold tracking-widest uppercase text-black"
            >
              Start
            </button>
          </div>
        </nav>

        {/* Hero content — sits above the beams */}
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-8 text-center lg:px-12">
          <span className="inline-flex items-center gap-2 border border-white/30 px-3 py-1 text-[9px] font-bold tracking-widest uppercase text-white/70">
            System Operational
          </span>

          <h1 className="mx-auto mt-10 max-w-5xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
            <SplitText
              text="THE INTELLIGENCE BEHIND THE INTERVIEW."
              className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
              delay={30}
              duration={0.8}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 60 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0}
              rootMargin="0px"
              textAlign="center"
              tag="span"
            />
          </h1>

          <div className="mx-auto mt-8 max-w-xl">
            <SplitText
              text="A specialized prep engine designed for high-stakes technical interviews. Tailored questions. Logical explanations. Zero friction."
              className="text-xs font-medium leading-relaxed tracking-wide text-neutral-400 sm:text-sm uppercase"
              delay={20}
              duration={0.6}
              ease="power2.out"
              splitType="words"
              from={{ opacity: 0, y: 20 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0}
              rootMargin="0px"
              textAlign="center"
              tag="p"
            />
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate('/signup')}
              className="group flex items-center gap-4 border border-white/40 bg-white px-10 py-5 text-[11px] font-bold tracking-[0.2em] uppercase text-black transition hover:bg-neutral-200"
            >
              Initiate Prep
              <FiArrowRight className="transition-transform group-hover:translate-x-1" size={14} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="border border-white/50 px-10 py-5 text-[11px] font-bold tracking-[0.2em] uppercase text-white transition hover:bg-white/10"
            >
              Sign In To Continue
            </button>
          </div>
        </div>
        </section>

      <div className="mx-auto max-w-7xl px-8 lg:px-12">

        {/* ── DIVIDER ── */}
        <div className="h-px bg-neutral-100 dark:bg-neutral-900" />

        {/* ── STATS ── */}
        <motion.section
          id="results"
          className="grid grid-cols-2 gap-y-12 py-20 md:grid-cols-4 md:py-32"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
        >
          {STATS.map((stat) => (
            <motion.div key={stat.label} className="text-center" variants={itemReveal}>
              <p className="text-4xl font-bold tracking-tighter sm:text-5xl">{stat.value}</p>
              <p className="mt-2 text-[10px] font-bold tracking-[0.2em] text-neutral-400">{stat.label}</p>
            </motion.div>
          ))}
        </motion.section>

        {/* ── DIVIDER ── */}
        <div className="h-px bg-neutral-100 dark:bg-neutral-900" />

        {/* ── FEATURES ── */}
        <motion.section
          id="features"
          className="py-24 lg:py-40"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
        >
          <div className="grid gap-x-12 gap-y-20 lg:grid-cols-12">
            <motion.div className="lg:col-span-4" variants={itemReveal}>
              <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">Core Capabilities</span>
              <h2 className="mt-6 text-3xl font-bold leading-tight tracking-tight uppercase sm:text-4xl">
                ENGINEERED FOR
                <br />
                PRECISION.
              </h2>
              <p className="mt-6 text-xs font-medium leading-relaxed tracking-wide text-neutral-400 uppercase">
                We replaced general practice with a structured intelligence layer that adapts to your career path.
              </p>
            </motion.div>

            <motion.div className="lg:col-span-8" variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}>
              <div className="grid gap-12 sm:grid-cols-2">
                {FEATURES.map((feat) => {
                  const Icon = feat.icon
                  return (
                    <motion.article key={feat.title} className="group" variants={itemReveal}>
                      <div className="mb-6 flex items-center gap-4">
                        <div className="h-1 w-8 bg-black dark:bg-white" />
                        <Icon size={18} />
                      </div>
                      <h3 className="text-xs font-bold tracking-widest uppercase">{feat.title}</h3>
                      <p className="mt-4 text-[11px] font-medium leading-relaxed tracking-wide text-neutral-400 uppercase">
                        {feat.desc}
                      </p>
                    </motion.article>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* ── DIVIDER ── */}
        <div className="h-px bg-neutral-100 dark:border-neutral-800" />

        {/* ── PRODUCT WINDOW SHOWCASE ── */}
        <motion.section
          className="py-24 lg:py-36"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400">Live Interface</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Inside The Prep Workspace</h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-neutral-500">
                Drop in your real product screenshot here. The framed window keeps it premium and product-focused.
              </p>
            </div>

            <motion.article
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.08)] dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900/70">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <div className="ml-2 flex-1 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400">
                  prepai.app/session-preview
                </div>
              </div>

              <div className="relative bg-black/95 p-3 sm:p-4">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />
                <motion.img
                  src={sessionPreview}
                  alt="PrepAI dashboard preview"
                  className="relative z-10 w-full rounded-xl border border-white/10 object-cover"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                />
              </div>
            </motion.article>
          </div>
        </motion.section>

        {/* ── CALL TO ACTION ── */}
        <motion.section
          className="py-24 text-center lg:py-40"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
        >
          <h2 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight uppercase sm:text-5xl lg:text-7xl">
            READY TO
            <br />
            COMMENCE?
          </h2>
          <button
            onClick={() => navigate('/signup')}
            className="mt-12 bg-black px-12 py-6 text-xs font-bold tracking-[0.3em] uppercase text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            Create Account
          </button>
        </motion.section>

        {/* ── FOOTER ── */}
        <motion.footer
          className="flex flex-col items-center justify-between gap-6 border-t border-neutral-200 py-12 dark:border-neutral-800 md:flex-row"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
        >
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 bg-black dark:bg-white" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">PrepAI © 2026</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-[10px] font-bold tracking-widest uppercase text-neutral-400 transition hover:text-black dark:hover:text-white">Privacy</a>
            <a href="#" className="text-[10px] font-bold tracking-widest uppercase text-neutral-400 transition hover:text-black dark:hover:text-white">Terms</a>
          </div>
        </motion.footer>
      </div>
    </main>
  )
}

export default LandingPage
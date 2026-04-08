import heroImage from '../assets/main.png'

const LandingPage = () => {
  const handleLoginSignupClick = () => {
    // Placeholder action until auth modal/page is connected.
    console.log('Login / Sign Up clicked')
  }

  const handleGetStartedClick = () => {
    const featuresSection = document.getElementById('features-section')
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#efede2] text-[#0d0d0d]">
      <div className="absolute inset-x-0 top-0 h-[560px] bg-[#f6f2df]" />
      <div className="absolute inset-x-0 bottom-0 h-[260px] bg-[#f5f5f6]" />

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 pb-10 pt-7 md:px-10 lg:px-14">
        <header className="flex items-center justify-between">
          <p className="text-[22px] font-semibold leading-none tracking-[-0.02em] md:text-[24px]">
            Interview Prep AI
          </p>

          <button
            type="button"
            onClick={handleLoginSignupClick}
            aria-label="Open login or signup"
            className="cursor-pointer rounded-full bg-[#f09331] px-7 py-3 text-[15px] font-semibold leading-none text-white md:px-9"
          >
            Login / Sign Up
          </button>
        </header>

        <section className="mt-14 grid grid-cols-1 gap-10 lg:mt-16 lg:grid-cols-2 lg:gap-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e8c86c] bg-[#f8efc0] px-4 py-[6px] text-[13px] font-semibold leading-none text-[#d18a18]">
              <span className="text-[11px]">✧</span> AI Powered
            </span>

            <h1 className="mt-7 max-w-[640px] text-[58px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[72px]">
              Ace Interviews with
              <br />
              <span className="text-[#f09331]">AI-Powered</span> Learning
            </h1>
          </div>

          <div className="pt-3 lg:pt-6">
            <p className="max-w-[610px] text-[21px] leading-[1.45] tracking-[-0.015em] text-black/85 md:text-[24px]">
              Get role-specific questions, expand answers when you need them, dive
              deeper into concepts, and organize everything your way. From
              preparation to mastery - your ultimate interview toolkit is here.
            </p>

            <button
              type="button"
              onClick={handleGetStartedClick}
              aria-label="Get started"
              className="mt-8 cursor-pointer rounded-full bg-black px-10 py-4 text-[14px] font-semibold leading-none text-white md:text-[16px]"
            >
              Get Started
            </button>
          </div>
        </section>

        <section className="mt-12 rounded-[18px] border border-[#ddcc8f] bg-[#f7f1d9] p-3 md:mt-14">
          <img
            src={heroImage}
            alt="Interview dashboard preview"
            className="h-auto w-full rounded-[14px] object-cover"
          />
        </section>

        <section id="features-section" className="mt-16 pb-10 md:mt-20">
          <h2 className="text-center text-[34px] font-semibold tracking-[-0.02em] text-black md:text-[48px]">
            Features That Make You Shine
          </h2>

          <div className="relative mt-12 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
            <article className="rounded-[18px] border border-[#eee4be] bg-[#f9f8f5] px-8 py-8 shadow-[0_2px_10px_rgba(0,0,0,0.03)] lg:col-span-4">
              <h3 className="text-[26px] font-semibold tracking-[-0.015em]">Tailored Just for You</h3>
              <p className="mt-5 text-[21px] leading-[1.45] text-[#3f4352]">
                Get interview questions and model answers based on your role,
                experience, and specific focus areas - no generic practice here.
              </p>
            </article>

            <article className="rounded-[18px] border border-[#eee4be] bg-[#f9f8f5] px-8 py-8 shadow-[0_2px_10px_rgba(0,0,0,0.03)] lg:col-span-4">
              <h3 className="text-[26px] font-semibold tracking-[-0.015em]">Learn at Your Own Pace</h3>
              <p className="mt-5 text-[21px] leading-[1.45] text-[#3f4352]">
                Expand answers only when you&apos;re ready. Dive deeper into any
                concept instantly with AI-powered detailed explanations.
              </p>
            </article>

            <article className="rounded-[18px] border border-[#eee4be] bg-[#f9f8f5] px-8 py-8 shadow-[0_2px_10px_rgba(0,0,0,0.03)] lg:col-span-4">
              <h3 className="text-[26px] font-semibold tracking-[-0.015em]">Capture Your Insights</h3>
              <p className="mt-5 text-[21px] leading-[1.45] text-[#3f4352]">
                Add personal notes to any question and pin important ones to the top
                - making your learning more organized and impactful.
              </p>
            </article>

            <article className="rounded-[18px] border border-[#eee4be] bg-[#f9f8f5] px-8 py-8 shadow-[0_2px_10px_rgba(0,0,0,0.03)] lg:col-span-6">
              <h3 className="text-[26px] font-semibold tracking-[-0.015em]">Understand the &quot;Why&quot; Behind Answers</h3>
              <p className="mt-5 text-[21px] leading-[1.45] text-[#3f4352]">
                Beyond just answers - unlock detailed concept explanations generated
                by AI, helping you truly master each topic.
              </p>
            </article>

            <article className="rounded-[18px] border border-[#eee4be] bg-[#f9f8f5] px-8 py-8 shadow-[0_2px_10px_rgba(0,0,0,0.03)] lg:col-span-6">
              <h3 className="text-[26px] font-semibold tracking-[-0.015em]">Save, Organize, and Revisit</h3>
              <p className="mt-5 text-[21px] leading-[1.45] text-[#3f4352]">
                Easily save your interview sets, organize them neatly in your
                dashboard, and pick up your preparation right where you left off.
              </p>
            </article>

            <div className="pointer-events-none absolute right-[-34px] top-[84px] hidden items-center gap-5 text-[42px] font-medium text-[#e8e4d4] lg:flex">
              <span>+5</span>
              <span className="text-[58px]">›</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default LandingPage
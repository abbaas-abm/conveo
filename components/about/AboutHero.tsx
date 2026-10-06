import Image from "next/image";

/**
 * The original About page hero (CSD-centred). Kept as a component for future
 * use — it is not currently rendered on the About page.
 */
export function AboutHero() {
  return (
    <section className="relative overflow-hidden bg-primary text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#d9b45b]">
            About the CSD
          </span>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-balance text-white sm:text-4xl lg:text-5xl">
            A dynamic, innovative centre for student development
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            The Centre for Student Development integrates and enhances student
            development and support services.
          </p>
        </div>

        <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/15 shadow-2xl lg:justify-self-end lg:max-w-md">
          <Image
            src="/img-about-1.jpg"
            alt="Wits students at a CSD event"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 480px"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

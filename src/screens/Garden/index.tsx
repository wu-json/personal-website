const GardenScreen = () => (
  <div className='w-full h-screen bg-black flex items-center justify-center'>
    <div className='flex flex-col items-center gap-3'>
      <h1 className='bio-glitch text-white text-2xl sm:text-4xl font-pixel'>
        Garden
      </h1>
      <p className='bio-glitch text-white/50 text-xs sm:text-sm font-pixel'>
        {'<under construction />'}
      </p>
    </div>
  </div>
);

export { GardenScreen };

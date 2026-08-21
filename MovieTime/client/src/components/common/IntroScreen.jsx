const IntroScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black">
      <h1 className="text-4xl font-bold tracking-wide text-white">
        Movie<span className="text-primary">Time</span>
      </h1>
      <div className="w-10 h-10 mt-6 border-2 rounded-full border-white/20 border-t-primary animate-spin" />
    </div>
  );
};

export default IntroScreen;

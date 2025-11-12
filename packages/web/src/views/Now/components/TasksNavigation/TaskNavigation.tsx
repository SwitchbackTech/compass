export function TaskNavigation() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handlePrevTask}
            className="group relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-white transition-all duration-200 hover:scale-110 hover:border-blue-400"
            title="Previous Task (j)"
            aria-label="Previous Task"
          >
            <ArrowLeft className="h-5 w-5 text-white transition-colors group-hover:text-blue-400" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Previous Task (j)</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleNextTask}
            className="group relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-white transition-all duration-200 hover:scale-110 hover:border-blue-400"
            title="Next Task (k)"
            aria-label="Next Task"
          >
            <ArrowRight className="h-5 w-5 text-white transition-colors group-hover:text-blue-400" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Next Task (k)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

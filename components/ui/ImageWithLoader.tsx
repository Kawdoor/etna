import React, { useState } from "react";

interface ImageWithLoaderProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  loaderClassName?: string;
}

const ShimmerLoader = ({ loaderClassName }: { loaderClassName?: string }) => {
  return (
    <div className={`absolute inset-0 bg-neutral-200 dark:bg-zinc-800 animate-pulse flex items-center justify-center border border-white/5 ${loaderClassName || ""}`}>
      <div className="text-xs font-futuristic tracking-[0.3em] text-neutral-500 dark:text-white/50">
        LOADING...
      </div>
    </div>
  );
};

export const ImageWithLoader: React.FC<ImageWithLoaderProps> = ({
  src,
  alt,
  className,
  containerClassName,
  loaderClassName,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div
      className={`relative overflow-hidden bg-neutral-100 dark:bg-zinc-900 ${containerClassName || ""}`}
    >
      {isLoading && <ShimmerLoader loaderClassName={loaderClassName} />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`${className} transition-opacity duration-500 ${isLoading ? "opacity-0" : "opacity-100"}`}
        onLoad={() => setIsLoading(false)}
        {...props}
      />
    </div>
  );
};

import {
  Lock,
  Banknote,
  ArrowDownCircle,
  Share2,
  HelpCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

interface GameInfo {
  image: string;
  name: string;
  status: string;
  to?: string;
  fullWidth?: boolean;
}

// Supported image extensions
const SUPPORTED_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "avif",
  "gif",
  "bmp",
  "svg",
];

const Landing = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [preferredFormats, setPreferredFormats] = useState<Map<string, string>>(
    new Map(),
  );

  useEffect(() => {
    localStorage.removeItem("bingo_game_state");
  }, []);

  useEffect(() => {
    async function fetchGames() {
      try {
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
        const res = await fetch(`${BACKEND_URL}/games`);
        const data = await res.json();
        setGames(data.games || []);
      } catch (error) {
        console.log(error);
        setGames([]);
      } finally {
        setLoading(false);
      }
    }
    fetchGames();
  }, []);

  // Check if the image URL is already a full URL
  const isFullUrl = (url: string) => {
    return (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    );
  };

  // Get the base filename without extension
  const getImageBase = (image: string) => {
    if (isFullUrl(image)) {
      const urlParts = image.split("/");
      const filename = urlParts[urlParts.length - 1].split("?")[0];
      return filename.replace(/\.[^/.]+$/, "");
    }
    const withoutQuery = image.split("?")[0];
    return withoutQuery.replace(/\.[^/.]+$/, "");
  };

  // Get the original extension if present
  const getOriginalExtension = (image: string) => {
    if (isFullUrl(image)) {
      const urlParts = image.split("/");
      const filename = urlParts[urlParts.length - 1].split("?")[0];
      const match = filename.match(/\.([^/.]+)$/);
      return match ? match[1].toLowerCase() : "";
    }
    const withoutQuery = image.split("?")[0];
    const match = withoutQuery.match(/\.([^/.]+)$/);
    return match ? match[1].toLowerCase() : "";
  };

  // Get the base path
  const getBasePath = (image: string) => {
    if (isFullUrl(image)) {
      const lastSlash = image.lastIndexOf("/");
      return lastSlash > 0 ? image.substring(0, lastSlash + 1) : "";
    }
    return "";
  };

  // Get all possible image URLs
  const getImageUrls = (image: string) => {
    if (isFullUrl(image)) {
      const basePath = getBasePath(image);
      const baseName = getImageBase(image);
      const originalExt = getOriginalExtension(image);
      const urls: string[] = [];

      // Add original URL first if it exists
      if (originalExt) {
        urls.push(image);
      }

      // Add all supported extensions
      SUPPORTED_EXTENSIONS.forEach((ext) => {
        if (ext !== originalExt) {
          urls.push(`${basePath}${baseName}.${ext}`);
        }
      });

      return urls;
    } else {
      const base = getImageBase(image);
      const originalExt = getOriginalExtension(image);

      const urls: string[] = [];

      // Add original extension first if it exists
      if (originalExt) {
        urls.push(`${base}.${originalExt}`);
      }
      // Add all supported extensions
      SUPPORTED_EXTENSIONS.forEach((ext) => {
        if (ext !== originalExt) {
          urls.push(`${base}.${ext}`);
        }
      });

      return urls;
    }
  };

  // Preload images and find which format works best
  useEffect(() => {
    games.forEach((game) => {
      const imageUrls = getImageUrls(game.image);
      let loaded = false;

      const tryLoadImage = (index: number) => {
        if (loaded || index >= imageUrls.length) {
          if (!loaded) {
            console.log(`All formats failed for ${game.name}`);
            setFailedImages((prev) => new Set(prev).add(game.image));
          }
          return;
        }
        const img = new Image();
        img.onload = () => {
          console.log(
            `Successfully loaded ${game.name} with:`,
            imageUrls[index],
          );
          loaded = true;
          setLoadedImages((prev) => new Set(prev).add(game.image));
          // Store the working format
          setPreferredFormats((prev) =>
            new Map(prev).set(game.image, imageUrls[index]),
          );
        };
        img.onerror = () => {
          console.log(`Failed to load ${game.name} with:`, imageUrls[index]);
          tryLoadImage(index + 1);
        };
        img.src = imageUrls[index];
      };

      tryLoadImage(0);
    });
  }, [games]);

  // Get MIME type for extension
  const getMimeType = (ext: string): string => {
    const mimeMap: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      avif: "image/avif",
      gif: "image/gif",
      bmp: "image/bmp",
      svg: "image/svg+xml",
      ico: "image/x-icon",
    };
    return mimeMap[ext] || `image/${ext}`;
  };

  // Prepare lists
  const activeGamesList: (GameInfo | null)[] = loading
    ? Array.from({ length: 2 }, () => null)
    : games.filter((g) => g.status === "ACTIVE");

  const futureGamesList: (GameInfo | null)[] = loading
    ? Array.from({ length: 6 }, () => null)
    : games.filter((g) => g.status !== "ACTIVE");

  return (
    <div className="flex flex-col ">
      {/* ACTION BUTTONS */}
      {/* <div className="flex gap-2  py-3 my-1">
        <button
          onClick={() => navigate("/deposit")}
          className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 text-black text-[13px] font-bold  py-2 rounded-md shadow-lg shadow-yellow-500/20"
        >
          <Banknote
            size={16}
            className="[text-shadow:0_2px_4px_rgba(0,0,0,0.9)]"
          />
          Deposit
        </button>
        <button
          onClick={() => navigate("/withdraw")}
          className="flex-1 flex items-center justify-center gap-2 text-white/85 text-xs font-semibold [text-shadow:0_1.5px_3px_rgba(0,0,0,0.7)] py-2 rounded-md border border-yellow-400 hover:bg-yellow-300 hover:scale-[1.02] transition-all"
        >
          <ArrowDownCircle size={16} />
          Withdraw
        </button>
        <button
          onClick={() => navigate("/share")}
          className="flex-1 flex items-center justify-center gap-2 text-white/85 text-xs font-semibold [text-shadow:0_1.5px_3px_rgba(0,0,0,0.7)] py-2 rounded-md border border-yellow-400 hover:bg-yellow-300 hover:scale-[1.02] transition-all"
        >
          <Share2 size={16} />
          Invite
        </button>
      </div> */}

      {/* ACTIVE GAMES */}
      <div className="flex flex-col mt-4">
        <div>
          <div className="">
            <h2 className="text-slate-400 text-xs font-bold mb-2 tracking-wider">
              AVAILABLE GAMES
            </h2>
            {/* <Link
          to="/help"
          className=" flex gap-2 mx-1.5 mb-2 animate-pulse items-center text-blue-400 text-xs font-semibold hover:text-[rgb(241,237,5)] transition"
        >
          < HelpCircle size={18} />
          <span className="text-[12px] font-bold">Help</span>
        </Link> */}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {activeGamesList.map((game, idx) => {
              if (!game) {
                return (
                  <div
                    key={`placeholder-active-${idx}`}
                    className="mx-auto w-[50vw] h-[33vh] rounded-lg bg-gray-800/30 animate-pulse"
                  />
                );
              }

              const imageUrls = getImageUrls(game.image);
              const hasFailed = failedImages.has(game.image);
              const isLoading = !loadedImages.has(game.image) && !hasFailed;
              const preferredUrl = preferredFormats.get(game.image);

              return (
                <Link
                  key={game.name}
                  to={game.to || "#"}
                  className="mx-auto  h-[33vh] group  relative overflow-hidden rounded-lg border-0.5  border-slate-800 transition-all duration-300 hover:-translate-y-1 "
                >
                  {isLoading ? (
                    <div className="w-[50vw] h-full bg-gray-800/30 animate-pulse" />
                  ) : hasFailed ? (
                    <div className="w-[50vw] h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center ">
                      <span className="text-white text-4xl font-bold opacity-30">
                        {game.name.charAt(0)}
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Use standard img tag with the working URL if we found one */}
                      {preferredUrl ? (
                        <img
                          src={preferredUrl}
                          alt={game.name}
                          className="w-[50vw] h-full object-cover transition-transform duration-300 group-hover:scale-105 border-[1px] border-green-600/30 rounded-lg"
                        />
                      ) : (
                        /* Fallback to picture element with proper ordering */
                        <picture className="absolute inset-0 block overflow-hidden">
                          {/* PNG first (most reliable) */}
                          <source
                            srcSet={
                              imageUrls.find((url) => url.includes(".png")) ||
                              ""
                            }
                            type="image/png"
                          />
                          {/* JPG second */}
                          <source
                            srcSet={
                              imageUrls.find(
                                (url) =>
                                  url.includes(".jpg") || url.includes(".jpeg"),
                              ) || ""
                            }
                            type="image/jpeg"
                          />
                          {/* Then modern formats */}
                          <source
                            srcSet={
                              imageUrls.find((url) => url.includes(".webp")) ||
                              ""
                            }
                            type="image/webp"
                          />
                          <source
                            srcSet={
                              imageUrls.find((url) => url.includes(".avif")) ||
                              ""
                            }
                            type="image/avif"
                          />
                          {/* Fallback img */}
                          <img
                            src={imageUrls[0]}
                            alt={game.name}
                            className="w-[50vw]  h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              const currentSrc = img.currentSrc || img.src;
                              const currentIndex =
                                imageUrls.indexOf(currentSrc);

                              if (currentIndex < imageUrls.length - 1) {
                                console.log(
                                  `Falling back to: ${imageUrls[currentIndex + 1]}`,
                                );
                                img.src = imageUrls[currentIndex + 1];
                              } else {
                                console.log(
                                  `All formats failed for ${game.name}`,
                                );
                                setFailedImages((prev) =>
                                  new Set(prev).add(game.image),
                                );
                              }
                            }}
                          //
                          />
                        </picture>
                      )}
                    </>
                  )}

                  <div className="absolute inset-0 flex flex-col justify-end items-center text-center p-4">
                    {/* PLAY NOW BUTTON */}
                    <div className="relative z-10 mb-[3%] px-1">
                      <span
                        className="
      relative inline-block 
      text-green-500 font-black text-md md:text-xl
      tracking-widest uppercase
      animate-[bounceText_1.5s_ease-in-out_infinite]
    "
                        style={{
                          textShadow: '0 0 30px rgba(240,0,184,0.6)'
                        }}
                      >
                        Play Now
                      </span>
                    </div>

                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* FUTURE RELEASES */}
        {/* <div className="-mt-4">
          <h2 className="text-slate-400 text-xs font-bold mb-2 tracking-wider">
            FUTURE RELEASES
          </h2>
          <div className="overflow-x-auto">
            <div className="grid grid-rows-2 grid-flow-col gap-2 min-w-max">
              {futureGamesList.map((game, idx) => {
                if (!game) {
                  return (
                    <div
                      key={`placeholder-future-${idx}`}
                      className="w-24 h-32 relative overflow-hidden rounded-lg opacity-80 bg-gray-800 animate-pulse"
                    />
                  );
                }

                const imageUrls = getImageUrls(game.image);
                const hasFailed = failedImages.has(game.image);
                const isLoading = !loadedImages.has(game.image) && !hasFailed;
                const preferredUrl = preferredFormats.get(game.image);

                return (
                  <div
                    key={game.name}
                    className="w-25 h-30
                     relative overflow-hidden border border-slate-700 rounded-lg opacity-80"
                  >
                    {isLoading ? (
                      <div className="w-full h-full bg-gray-800 animate-pulse" />
                    ) : hasFailed ? (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <span className="text-white text-xl font-bold opacity-30">
                          {game.name.charAt(0)}
                        </span>
                      </div>
                    ) : (
                      <>
                        {preferredUrl ? (
                          <img
                            src={preferredUrl}
                            alt={game.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <picture className="absolute inset-0 w-full h-full block overflow-hidden">
                            <source
                              srcSet={
                                imageUrls.find((url) => url.includes(".png")) ||
                                ""
                              }
                              type="image/png"
                            />
                            <source
                              srcSet={
                                imageUrls.find(
                                  (url) =>
                                    url.includes(".jpg") ||
                                    url.includes(".jpeg"),
                                ) || ""
                              }
                              type="image/jpeg"
                            />
                            <source
                              srcSet={
                                imageUrls.find((url) =>
                                  url.includes(".webp"),
                                ) || ""
                              }
                              type="image/webp"
                            />
                            <source
                              srcSet={
                                imageUrls.find((url) =>
                                  url.includes(".avif"),
                                ) || ""
                              }
                              type="image/avif"
                            />
                            <img
                              src={imageUrls[0]}
                              alt={game.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                const currentSrc = img.currentSrc || img.src;
                                const currentIndex =
                                  imageUrls.indexOf(currentSrc);

                                if (currentIndex < imageUrls.length - 1) {
                                  console.log(
                                    `Falling back to: ${imageUrls[currentIndex + 1]}`,
                                  );
                                  img.src = imageUrls[currentIndex + 1];
                                } else {
                                  console.log(
                                    `All formats failed for ${game.name}`,
                                  );
                                  setFailedImages((prev) =>
                                    new Set(prev).add(game.image),
                                  );
                                }
                              }}
                            />
                          </picture>
                        )}
                      </>
                    )}
                    <div className="absolute inset-0 flex flex-col justify-end h-full p-2 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                      <h3 className="text-xs font-bold text-white drop-shadow-[0_2px_4px_black]">
                        {game.name}
                      </h3>
                      <span className="flex items-center justify-center gap-1 text-[10px] text-yellow-400 font-semibold bg-black/50 px-1 rounded">
                        <Lock size={12} />
                        Coming Soon
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div> */}
        <div>
          <h2 className="text-slate-400 text-xs font-bold mb-2 tracking-wider mt-2">
            BINGO WINNING PATTERNS
          </h2>

          <div className="flex flex-wrap gap-y-1 gap-x-[2.4vw] items-center justify-center  ">
            {/* Horizontal */}
            <div className="flex flex-col items-center">
              <div className="w-[29vw] h-[29vw] bg-black -pl-1.5 pt-1 pb-2 pr-1.5 rounded-md ">
                <svg viewBox="0 0 50 50" className="w-full h-full">
                  {/* 5x5 grid of squares, fill middle row */}
                  {[0, 1, 2, 3, 4].map((r) =>
                    [0, 1, 2, 3, 4].map((c) => (
                      <rect
                        key={`h-${r}-${c}`}
                        x={2 + c * 10}
                        y={2 + r * 10}
                        width={8}
                        height={8}
                        rx={1}
                        fill={r === 2 ? "#019339" : "rgba(255,255,255,0.08)"}
                      />
                    )),
                  )}
                </svg>
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                HORIZONTAL
              </span>
            </div>
            {/* Vertical */}
            <div className="flex flex-col items-center">
              <div className="w-[30vw] h-[29.5vw] bg-black -pl-1.5 pt-1 pb-2 pr-1.5 rounded-md ">
                <svg viewBox="0 0 50 50" className="w-full h-full">
                  {[0, 1, 2, 3, 4].map((r) =>
                    [0, 1, 2, 3, 4].map((c) => (
                      <rect
                        key={`v-${r}-${c}`}
                        x={2 + c * 10}
                        y={2 + r * 10}
                        width={8}
                        height={8}
                        rx={1}
                        fill={c === 2 ? "#019339" : "rgba(255,255,255,0.08)"}
                      />
                    )),
                  )}
                </svg>
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                VERTICAL
              </span>
            </div>
            {/* Diagonal */}
            <div className="flex flex-col items-center">
              <div className="w-[29vw] h-[29vw] bg-black -pl-1.5 pt-1 pb-2 pr-1.5 rounded-md ">
                <svg viewBox="0 0 50 50" className="w-full h-full">
                  {[0, 1, 2, 3, 4].map((r) =>
                    [0, 1, 2, 3, 4].map((c) => (
                      <rect
                        key={`d-${r}-${c}`}
                        x={2 + c * 10}
                        y={2 + r * 10}
                        width={8}
                        height={8}
                        rx={1}
                        fill={c === r ? "#019339" : "rgba(255,255,255,0.08)"}
                      />
                    )),
                  )}
                </svg>
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                DIAGONAL
              </span>
            </div>

            {/* 4 Corners */}
            <div className="flex flex-col items-center">
              <div className="w-[29vw] h-[29vw] bg-black -pl-1.5 pt-1 pb-2 pr-1.5 rounded-md ">
                <svg viewBox="0 0 50 50" className="w-full h-full">
                  {[0, 1, 2, 3, 4].map((r) =>
                    [0, 1, 2, 3, 4].map((c) => {
                      const isCorner =
                        (r === 0 || r === 4) && (c === 0 || c === 4);
                      return (
                        <rect
                          key={`c-${r}-${c}`}
                          x={2 + c * 10}
                          y={2 + r * 10}
                          width={8}
                          height={8}
                          rx={1}
                          fill={isCorner ? "#019339" : "rgba(255,255,255,0.08)"}
                        />
                      );
                    }),
                  )}
                </svg>
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                4 CORNERS
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;

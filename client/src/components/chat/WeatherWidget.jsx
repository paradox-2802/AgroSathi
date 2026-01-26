import { motion, AnimatePresence } from "framer-motion";
import { Cloud, X, Droplets, Wind, CloudRain, MapPin, ArrowRight, CloudOff as CloudOffIcon } from "lucide-react";

export default function WeatherWidget({
    showWeather,
    setShowWeather,
    weather,
    darkMode,
    weatherLoading,
    showDailyForecast,
    setShowDailyForecast
}) {
    return (
        <>
            <AnimatePresence mode="wait">
                {showWeather && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowWeather(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className={`glass-card rounded-3xl shadow-2xl p-6 max-w-sm w-full relative z-50 overflow-hidden text-gray-800 dark:text-white`}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -z-10 translate-x-10 -translate-y-10" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-500/20 rounded-full blur-3xl -z-10 -translate-x-10 translate-y-10" />

                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
                                        <Cloud className="w-5 h-5" />
                                    </div>
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-200">
                                        Weather
                                    </span>
                                </h3>
                                <button
                                    onClick={() => setShowWeather(false)}
                                    className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-gray-700/50" : "hover:bg-gray-100/50"}`}
                                >
                                    <X className="w-5 h-5 opacity-70" />
                                </button>
                            </div>

                            {weatherLoading ? (
                                <div className="flex flex-col items-center py-10">
                                    <div className="relative w-16 h-16 mb-4">
                                        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
                                        <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
                                    </div>
                                    <p className="text-sm font-medium opacity-60 animate-pulse">Fetching forecast...</p>
                                </div>
                            ) : weather ? (
                                <div className="space-y-8">
                                    <div className="text-center relative py-2">
                                        <div className="flex flex-col items-center animate-float">
                                            <h2 className="text-7xl font-bold mb-2 tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">
                                                {Math.round(weather.temp)}°
                                            </h2>
                                            <p className="text-lg font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-4 py-1 rounded-full">
                                                {weather.desc}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { icon: Droplets, label: "Humidity", value: `${weather.humidity}%`, color: "text-blue-500", bg: "bg-blue-500/10" },
                                            { icon: Wind, label: "Wind", value: `${weather.wind} km/h`, color: "text-teal-500", bg: "bg-teal-500/10" },
                                            { icon: CloudRain, label: "Rain Chance", value: `${weather.rainChance}%`, color: "text-indigo-500", bg: "bg-indigo-500/10" },
                                            { icon: CloudRain, label: "Rain Vol", value: `${weather.rainSum} mm`, color: "text-cyan-500", bg: "bg-cyan-500/10" }
                                        ].map((item, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className={`p-4 rounded-2xl ${darkMode ? "bg-gray-800/40" : "bg-white/40"} border border-white/10 backdrop-blur-sm flex flex-col gap-1 hover:bg-white/10 transition-colors`}
                                            >
                                                <div className="flex items-center gap-2 opacity-70 mb-1">
                                                    <item.icon className={`w-4 h-4 ${item.color}`} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                                                </div>
                                                <p className="text-xl font-bold tracking-tight">{item.value}</p>
                                            </motion.div>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2 text-xs font-medium opacity-50 justify-center bg-gray-100 dark:bg-gray-800/50 py-2 rounded-lg">
                                        <MapPin className="w-3 h-3" />
                                        <span>Local Forecast • Updated just now</span>
                                    </div>

                                    {weather.daily && (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setShowDailyForecast(true)}
                                            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group"
                                        >
                                            <span className="text-sm">View 7-Day Forecast</span>
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </motion.button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-12 opacity-60">
                                    <CloudOffIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p className="font-medium">Weather data unavailable</p>
                                    <p className="text-xs mt-1">Please check your location settings</p>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {showDailyForecast && weather && weather.daily && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowDailyForecast(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className={`glass-card rounded-3xl shadow-2xl p-6 max-w-md w-full max-h-[85vh] flex flex-col relative z-50 text-gray-800 dark:text-white`}
                        >
                            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
                                        <Cloud className="w-5 h-5" />
                                    </div>
                                    7-Day Forecast
                                </h3>
                                <button
                                    onClick={() => setShowDailyForecast(false)}
                                    className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-gray-700/50" : "hover:bg-gray-100/50"}`}
                                >
                                    <X className="w-5 h-5 opacity-70" />
                                </button>
                            </div>

                            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                                {weather.daily.map((day, idx) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        key={idx}
                                        className={`p-4 rounded-2xl flex items-center justify-between transition-colors ${darkMode ? "bg-gray-800/40 hover:bg-gray-700/40" : "bg-white/40 hover:bg-white/60"
                                            } border border-white/5`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center ${darkMode ? "bg-gray-700/50" : "bg-white/80"
                                                } shadow-sm text-sm font-bold border border-white/10`}>
                                                <span className="text-xs opacity-60 uppercase">{day.date.split(',')[0]}</span>
                                                <span className="text-lg leading-none mt-1">{day.date.split(' ')[2]}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-base font-semibold">{day.date.split(',')[1]}</span>
                                                <span className="text-xs opacity-60 font-medium">{day.desc}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-5 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-xl">{Math.round(day.maxTemp)}°</span>
                                                <span className="text-xs opacity-50 font-medium">{Math.round(day.minTemp)}°</span>
                                            </div>
                                            <div className="flex flex-col items-center w-10 bg-blue-500/10 rounded-xl py-2 dark:bg-blue-400/10">
                                                <span className="text-[10px] font-bold text-blue-500">{day.rainChance}%</span>
                                                <CloudRain className="w-3.5 h-3.5 text-blue-500 opacity-60 mt-0.5" />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import useTabSynchronization from "@/hooks/useTabSynchronization";
import Logo from "@/components/Logo";
import SplashScreen from "@/components/SplashScreen";
import LogoIcon from "../../public/chat-logo.svg?react";
import HeroBackground from "@/components/HeroBackground";
import landingSvg from "../assets/svg/landing.svg";
import aboutSvg from "../assets/svg/about.svg";
import contactSvg from "../assets/svg/contact.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  MessageCircle,
  Shield,
  Zap,
  Info,
  Mail,
  MessageSquare,
  LogOut,
  MoreVertical,
  Menu,
} from "lucide-react";

const HomePage = () => {
  const [navOpen, setNavOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [isUser, setIsUser] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  // Navigation links array
  const navLinks = [
    {
      id: 1,
      label: "About",
      icon: Info,
      action: () => scrollToSection("About"),
      showWhenLoggedIn: true,
      showWhenLoggedOut: true,
    },
    {
      id: 2,
      label: "Contact",
      icon: Mail,
      action: () => scrollToSection("Contact"),
      showWhenLoggedIn: true,
      showWhenLoggedOut: true,
    },
    {
      id: 3,
      label: "Chat",
      icon: MessageSquare,
      action: () => handleNavigation("/chat"),
      showWhenLoggedIn: true,
      showWhenLoggedOut: true, // Now visible for all users - route protection will redirect to login
    },
  ];

  const toggleNavOpen = () => {
    setNavOpen(!navOpen);
  };

  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setNavOpen(false);
    }
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleSignOut = () => {
    // Clear localStorage
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    // Update state
    setIsUser(false);
    setUserDetails(null);

    // Redirect to home and reload
    navigate("/");
    window.location.reload();
  };

  const handleResize = () => {
    setIsMobile(window.innerWidth < 640);
  };

  // Initialize tab synchronization (sync logout across tabs)
  useTabSynchronization();

  // Load user data from localStorage
  useEffect(() => {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUserDetails(parsedUser);
        setIsUser(true);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const checkMobileNav = () => {
    if (navOpen && isMobile) {
      return true;
    }
  };

  return (
    <>
      {!loading ? (
        <>
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed z-50 transition-all duration-500 ${
              isScrolled
                ? "top-4 left-1/2 -translate-x-1/2 w-auto"
                : "top-0 left-0 right-0 w-full"
            }`}
          >
            <nav
              className={`flex justify-between items-center transition-all duration-500 ${
                isScrolled
                  ? "bg-gradient-to-r from-white/70 via-primaryColor/5 to-white/70 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(238,199,244,0.37)] border border-primaryColor/30 rounded-full px-6 py-3"
                  : "w-full px-[7.5%] bg-white border-b border-slate-100 py-4"
              }`}
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="navLeft"
              >
                <button
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity group"
                >
                  <Logo
                    className={`transition-all ${
                      isScrolled ? "w-9 h-9" : "w-12 h-12"
                    }`}
                    showText={true}
                    textClassName={`text-[#040316] transition-all ${
                      isScrolled ? "text-lg" : "text-2xl"
                    }`}
                  />
                </button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="navCenter sm:block hidden"
              >
                <ul
                  className={`flex transition-all ${
                    isScrolled ? "gap-4" : "gap-8"
                  }`}
                >
                  {navLinks
                    .filter((link) =>
                      isUser ? link.showWhenLoggedIn : link.showWhenLoggedOut
                    )
                    .map((link) => {
                      const Icon = link.icon;
                      return (
                        <li key={link.id}>
                          <Button
                            variant="ghost"
                            onClick={link.action}
                            className={`text-slate-700 hover:text-darkPurple font-medium transition-all flex items-center gap-2 cursor-pointer ${
                              isScrolled ? "text-sm px-3 py-1.5 h-auto" : ""
                            }`}
                          >
                            <Icon
                              className={`${
                                isScrolled ? "w-3.5 h-3.5" : "w-4 h-4"
                              }`}
                            />
                            {link.label}
                          </Button>
                        </li>
                      );
                    })}
                </ul>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="navRight sm:block hidden"
              >
                {!isUser ? (
                  <>
                    <div className="btnContainer flex gap-3">
                      <Button
                        onClick={() => handleNavigation("/login")}
                        variant="outline"
                        className={`border cursor-pointer border-slate-300 text-slate-700 hover:border-[#040316] hover:text-[#040316] hover:bg-slate-50 font-medium rounded-xl transition-all duration-300 ${
                          isScrolled ? "px-4 py-1.5 text-sm h-auto" : "px-6"
                        }`}
                      >
                        Log In
                      </Button>
                      <Button
                        onClick={() => handleNavigation("/signup")}
                        className={`bg-gradient-to-r from-[#040316] cursor-pointer to-[#1a1a2e] hover:from-[#1a1a2e] hover:to-deepNavy text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ${
                          isScrolled ? "px-4 py-1.5 text-sm h-auto" : "px-6"
                        }`}
                      >
                        Sign Up
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className={`userLoggedIn flex items-center transition-all ${
                        isScrolled ? "gap-2" : "gap-3"
                      }`}
                    >
                      <Avatar
                        className={`border border-slate-200 shadow-md transition-all ${
                          isScrolled ? "w-[36px] h-[36px]" : "w-[42px] h-[42px]"
                        }`}
                      >
                        <AvatarImage
                          src={userDetails?.image}
                          alt={userDetails?.fullName}
                          // onClick={navigate("/chat")}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primaryColor to-secondaryColor text-slate-800 font-semibold text-sm">
                          {userDetails?.fullName?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`userName font-medium text-slate-800 transition-all ${
                          isScrolled ? "text-sm" : ""
                        }`}
                      >
                        {userDetails?.fullName}
                      </div>
                      <div className="chatAreaBtn">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`text-slate-700 hover:bg-gradient-to-r hover:from-primaryColor/20 hover:to-secondaryColor/20 rounded-full transition-all cursor-pointer border border-transparent hover:border-primaryColor/30 ${
                                isScrolled ? "w-8 h-8" : "w-10 h-10"
                              }`}
                            >
                              <MoreVertical
                                className={`${
                                  isScrolled ? "w-4 h-4" : "w-5 h-5"
                                }`}
                              />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="min-w-[180px] rounded-xl shadow-lg border border-slate-200"
                          >
                            <DropdownMenuItem
                              onClick={handleSignOut}
                              className="cursor-pointer hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 rounded-lg transition-all py-2.5 px-3"
                            >
                              <LogOut className="w-4 h-4 mr-3 text-red-500" />
                              <span className="font-medium text-slate-700">
                                Log out
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>

              <div className="mobileNavToggler sm:hidden block">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleNavOpen}
                  className="text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <Menu className="w-6 h-6" />
                </Button>
              </div>
            </nav>

            {checkMobileNav() ? (
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                transition={{ duration: 0.3 }}
                className="mobileNav fixed left-0 top-0 min-w-[300px] min-h-full z-20 shadow-2xl bg-white"
                ref={menuRef}
              >
                <div className="w-full flex justify-center mt-10">
                  <Logo showText={true} textClassName="text-3xl font-bold text-slate-800" className="w-12 h-12" />
                </div>
                <div className="navLinks mt-10 p-3 flex items-center justify-center">
                  <ul className="flex flex-col gap-10">
                    <li>
                      {!isUser ? (
                        ""
                      ) : (
                        <>
                          <div className="userLoggedIn flex flex-col items-center gap-2">
                            <div className="userInfo flex items-center gap-4">
                              <Avatar className="w-[50px] h-[50px] border border-slate-200">
                                <AvatarImage
                                  src={userDetails?.avatar}
                                  alt={userDetails?.fullName}
                                />
                                <AvatarFallback className="bg-gradient-to-br from-primaryColor to-secondaryColor text-slate-800 font-semibold">
                                  {userDetails?.fullName
                                    ?.charAt(0)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="userName text-slate-800 font-medium">
                                {userDetails?.fullName}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </li>
                    {navLinks
                      .filter((link) =>
                        isUser ? link.showWhenLoggedIn : link.showWhenLoggedOut
                      )
                      .map((link) => {
                        const Icon = link.icon;
                        return (
                          <li key={link.id} onClick={toggleNavOpen}>
                            <Button
                              variant="ghost"
                              onClick={link.action}
                              className="text-slate-700 hover:text-darkPurple font-medium flex items-center gap-2 cursor-pointer"
                            >
                              <Icon className="w-4 h-4" />
                              {link.label}
                            </Button>
                          </li>
                        );
                      })}
                    <li>
                      {!isUser ? (
                        <>
                          <div className="btnContainer flex flex-col items-center gap-6">
                            <Button
                              onClick={() => handleNavigation("/login")}
                              variant="outline"
                              className="border border-slate-300 text-slate-700 hover:border-[#040316] hover:text-[#040316] hover:bg-slate-50 font-medium px-8 py-2 rounded-xl transition-all duration-300 w-full"
                            >
                              Log In
                            </Button>
                            <Button
                              onClick={() => handleNavigation("/signup")}
                              className="bg-gradient-to-r from-[#040316] to-[#1a1a2e] hover:from-[#1a1a2e] hover:to-[#040316] text-white font-medium px-8 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full"
                            >
                              Sign Up
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="userLoggedIn flex flex-col items-center gap-10">
                            <div className="LogOutBtn" onClick={toggleNavOpen}>
                              <Button
                                variant="outline"
                                onClick={handleSignOut}
                                className="border-2 border-red-300 text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:border-red-400 font-semibold px-8 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 w-full shadow-sm hover:shadow-md"
                              >
                                <LogOut className="w-5 h-5" />
                                <span>Log out</span>
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </li>
                  </ul>
                </div>
              </motion.div>
            ) : (
              ""
            )}
          </motion.div>

          <section className="HeroSection pt-32 pb-20 min-h-screen flex items-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
            {/* Canvas Animation Background */}
            <HeroBackground />

            {/* Animated Particles & Grid Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none hidden">
              {/* Animated Grid Pattern */}
              <div className="absolute inset-0 hero-grid-pattern opacity-30"></div>

              {/* Floating Particles */}
              <div className="particle particle-1"></div>
              <div className="particle particle-2"></div>
              <div className="particle particle-3"></div>
              <div className="particle particle-4"></div>
              <div className="particle particle-5"></div>
              <div className="particle particle-6"></div>
              <div className="particle particle-7"></div>
              <div className="particle particle-8"></div>

              {/* Gradient Orbs */}
              <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-gradient-to-br from-primaryColor/30 to-transparent rounded-full blur-3xl animate-float"></div>
              <div className="absolute top-40 right-20 w-[400px] h-[400px] bg-gradient-to-br from-secondaryColor/30 to-transparent rounded-full blur-3xl animate-float animation-delay-2000"></div>
              <div className="absolute bottom-20 left-1/3 w-[450px] h-[450px] bg-gradient-to-br from-lightPurple/20 to-transparent rounded-full blur-3xl animate-float animation-delay-4000"></div>

              {/* Animated Lines */}
              <svg
                className="absolute inset-0 w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient
                    id="lineGradient1"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#EEC7F4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#ABD4FF" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient
                    id="lineGradient2"
                    x1="100%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#ABD4FF" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#C4B5FD" stopOpacity="0.3" />
                  </linearGradient>
                </defs>

                {/* Animated curved lines */}
                <path
                  className="animated-line line-1"
                  d="M0,200 Q400,100 800,200 T1600,200"
                  stroke="url(#lineGradient1)"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  className="animated-line line-2"
                  d="M0,400 Q500,300 1000,400 T2000,400"
                  stroke="url(#lineGradient2)"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  className="animated-line line-3"
                  d="M-200,300 Q300,400 800,300 T1800,300"
                  stroke="url(#lineGradient1)"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>

              {/* Fog Wave Layers */}
              <div className="fog-container">
                <svg
                  className="fog-layer fog-1"
                  viewBox="0 0 1440 320"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="fogGradient1"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        stopColor="#EEC7F4"
                        stopOpacity="0.15"
                      />
                      <stop
                        offset="50%"
                        stopColor="#ABD4FF"
                        stopOpacity="0.25"
                      />
                      <stop
                        offset="100%"
                        stopColor="transparent"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    fill="url(#fogGradient1)"
                    d="M0,128L48,144C96,160,192,192,288,197.3C384,203,480,181,576,154.7C672,128,768,96,864,101.3C960,107,1056,149,1152,154.7C1248,160,1344,128,1392,112L1440,96L1440,320L0,320Z"
                  />
                </svg>

                <svg
                  className="fog-layer fog-2"
                  viewBox="0 0 1440 320"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="fogGradient2"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        stopColor="#C4B5FD"
                        stopOpacity="0.12"
                      />
                      <stop
                        offset="50%"
                        stopColor="#9290c3"
                        stopOpacity="0.2"
                      />
                      <stop
                        offset="100%"
                        stopColor="transparent"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    fill="url(#fogGradient2)"
                    d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,176C672,160,768,160,864,170.7C960,181,1056,203,1152,208C1248,213,1344,203,1392,197.3L1440,192L1440,320L0,320Z"
                  />
                </svg>

                <svg
                  className="fog-layer fog-3"
                  viewBox="0 0 1440 320"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="fogGradient3"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        stopColor="#ABD4FF"
                        stopOpacity="0.18"
                      />
                      <stop
                        offset="50%"
                        stopColor="#EEC7F4"
                        stopOpacity="0.3"
                      />
                      <stop
                        offset="100%"
                        stopColor="transparent"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    fill="url(#fogGradient3)"
                    d="M0,192L48,197.3C96,203,192,213,288,208C384,203,480,181,576,181.3C672,181,768,203,864,202.7C960,203,1056,181,1152,165.3C1248,149,1344,139,1392,133.3L1440,128L1440,320L0,320Z"
                  />
                </svg>

                <svg
                  className="fog-layer fog-4"
                  viewBox="0 0 1440 320"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="fogGradient4"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#9290c3" stopOpacity="0.1" />
                      <stop
                        offset="50%"
                        stopColor="#C4B5FD"
                        stopOpacity="0.22"
                      />
                      <stop
                        offset="100%"
                        stopColor="transparent"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    fill="url(#fogGradient4)"
                    d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,229.3C672,235,768,213,864,197.3C960,181,1056,171,1152,181.3C1248,192,1344,224,1392,240L1440,256L1440,320L0,320Z"
                  />
                </svg>
              </div>
            </div>
            <div className="container w-[85%] mx-auto flex md:flex-row flex-col justify-center items-center gap-12 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="heroLeft md:w-[50%] flex items-center justify-center"
              >
                <div className="heroInfo w-full max-w-xl">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="upperInfo"
                  >
                    <span className="inline-block px-4 py-2 bg-gradient-to-r from-primaryColor/30 to-secondaryColor/30 rounded-full text-sm font-semibold text-slate-700 mb-4">
                      Welcome to the future of chat
                    </span>
                    <Logo showText={true} textClassName="lg:text-7xl md:text-6xl text-5xl font-bold my-6 leading-tight text-[#040316]" className="w-20 h-20 md:w-24 md:h-24" />
                    <p className="text-xl text-slate-600 font-medium mb-2">
                      Weaving seamless connections
                    </p>
                    <p className="text-lg text-slate-500">One vibe at a time</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="lowerInfo mt-8 md:mb-0 mb-16"
                  >
                    <p className="text-slate-600 text-lg leading-relaxed mb-8">
                      Join VibeMesh and experience chat redefined—simple,
                      secure, and built for meaningful conversations.
                    </p>
                    <div className="flex gap-4 flex-wrap">
                      <Button
                        onClick={() => handleNavigation("/signup")}
                        className="bg-[#040316] hover:bg-[#040316]/90 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer"
                      >
                        Get Started Free
                      </Button>
                      <Button
                        onClick={() => scrollToSection("About")}
                        variant="outline"
                        className="border-2 border-[#040316] text-[#040316] hover:bg-[#040316] hover:text-white font-semibold px-8 py-6 text-lg rounded-xl transition-all cursor-pointer"
                      >
                        Learn More
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="heroRight md:w-[50%] w-full"
              >
                <motion.div
                  className="heroImgContainer relative"
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primaryColor/20 to-secondaryColor/20 rounded-3xl blur-3xl"></div>
                  <img
                    src={landingSvg}
                    alt="illustration"
                    draggable="false"
                    className="relative z-10 w-full drop-shadow-2xl"
                  />
                </motion.div>
              </motion.div>
            </div>
          </section>

          <section
            className="AboutSection min-h-screen bg-gradient-to-br from-slate-50 via-white to-primaryColor/5 flex items-center md:p-0 py-20 relative overflow-hidden"
            id="About"
          >
            {/* Decorative Elements */}
            <div className="absolute top-20 right-10 w-72 h-72 bg-secondaryColor/20 rounded-full filter blur-3xl"></div>
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-primaryColor/10 rounded-full filter blur-3xl"></div>
            <div className="container w-[85%] mx-auto flex md:flex-row flex-col items-center gap-16 relative z-10">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="aboutLeft md:w-[50%]"
              >
                <div className="aboutImage w-full relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primaryColor/20 to-secondaryColor/20 rounded-3xl blur-3xl"></div>
                  <img
                    src={aboutSvg}
                    alt="illustration"
                    className="w-full relative z-10 drop-shadow-2xl"
                    draggable="false"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="aboutRight md:w-[50%] md:mt-0 mt-12"
              >
                <div className="aboutInfo">
                  <h2 className="text-5xl font-bold mb-6">
                    <span className="bg-gradient-to-r from-darkPurple to-primaryColor bg-clip-text text-transparent">
                      About
                    </span>{" "}
                    <span className="text-slate-900">Us</span>
                  </h2>
                  <div className="space-y-4 text-slate-600 text-lg leading-relaxed">
                    <p>
                      At{" "}
                      <span className="font-semibold text-darkPurple">
                        VibeMesh
                      </span>
                      , we believe in the power of connection. Our chat platform
                      is designed to make conversations seamless, intuitive, and
                      fun.
                    </p>
                    <p>
                      Whether you're catching up with friends, collaborating
                      with colleagues, or building new communities, VibeMesh
                      offers a secure and vibrant space to share ideas and stay
                      in touch.
                    </p>
                    <p>
                      With easy-to-use features, personalized settings, and a
                      focus on user privacy, we aim to create an engaging
                      experience where every interaction counts.
                    </p>
                  </div>

                  {/* Feature Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 mb-8">
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-primaryColor/10 to-secondaryColor/10 rounded-xl">
                      <MessageCircle className="w-6 h-6 text-darkPurple" />
                      <span className="text-sm font-semibold text-slate-700">
                        Seamless Chat
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-primaryColor/10 to-secondaryColor/10 rounded-xl">
                      <Shield className="w-6 h-6 text-darkPurple" />
                      <span className="text-sm font-semibold text-slate-700">
                        Secure & Private
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-primaryColor/10 to-secondaryColor/10 rounded-xl">
                      <Zap className="w-6 h-6 text-darkPurple" />
                      <span className="text-sm font-semibold text-slate-700">
                        Lightning Fast
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleNavigation("/signup")}
                    className="bg-[#040316] hover:bg-[#040316]/90 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    Get Started Free
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>

          <section
            className="ContactSection min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-secondaryColor/5 to-slate-50 py-20 relative overflow-hidden"
            id="Contact"
          >
            {/* Decorative Gradient Blobs */}
            <div className="absolute top-10 left-10 w-80 h-80 bg-primaryColor/20 rounded-full filter blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-lightPurple/20 rounded-full filter blur-3xl"></div>
            <div className="container w-[85%] mx-auto flex md:flex-row flex-col items-center gap-16 relative z-10">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="contactLeft md:w-1/2 w-full"
              >
                <div className="contactInfo">
                  <h2 className="text-5xl font-bold mb-4">
                    <span className="bg-gradient-to-r from-darkPurple to-secondaryColor bg-clip-text text-transparent">
                      Contact
                    </span>{" "}
                    <span className="text-slate-900">Us</span>
                  </h2>
                  <p className="text-slate-600 text-lg mb-8">
                    Have questions? We'd love to hear from you.
                  </p>
                  <form
                    className="space-y-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="space-y-2"
                    >
                      <Label
                        htmlFor="name"
                        className="text-sm font-medium text-slate-700"
                      >
                        Name
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Your name"
                        className="h-12 bg-white border-slate-200 rounded-xl focus:border-primaryColor focus:ring-primaryColor transition-all"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="space-y-2"
                    >
                      <Label
                        htmlFor="email"
                        className="text-sm font-medium text-slate-700"
                      >
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        className="h-12 bg-white border-slate-200 rounded-xl focus:border-primaryColor focus:ring-primaryColor transition-all"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                      className="space-y-2"
                    >
                      <Label
                        htmlFor="message"
                        className="text-sm font-medium text-slate-700"
                      >
                        Message
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="Your message here..."
                        className="min-h-[140px] bg-white border-slate-200 rounded-xl focus:border-primaryColor focus:ring-primaryColor transition-all resize-none"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.4 }}
                    >
                      <Button
                        type="submit"
                        className="w-full h-12 bg-[#040316] hover:bg-[#040316]/90 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
                      >
                        Send Message
                      </Button>
                    </motion.div>
                  </form>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="contactRight w-1/2 md:block hidden"
              >
                <div className="contactImg relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primaryColor/20 to-secondaryColor/20 rounded-3xl blur-3xl"></div>
                  <img
                    src={contactSvg}
                    alt="illustration"
                    className="w-full relative z-10 drop-shadow-2xl"
                    draggable="false"
                  />
                </div>
              </motion.div>
            </div>
          </section>

          <footer className="Footer bg-slate-900 text-slate-300">
            <div className="container w-[85%] mx-auto py-16">
              <div className="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-12 mb-12">
                {/* Brand Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="footerLeftOne"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <LogoIcon className="w-10 h-10 fill-white" />
                    <span className="text-2xl font-bold text-white">
                      VibeMesh
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Weaving seamless connections, one vibe at a time. Join us in
                    redefining chat.
                  </p>
                </motion.div>

                {/* Useful Links */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="footerCenterTwo"
                >
                  <h3 className="text-white font-semibold text-lg mb-4">
                    Useful Links
                  </h3>
                  <ul className="space-y-2">
                    <li>
                      <Button
                        variant="ghost"
                        onClick={() => handleNavigation("/login")}
                        className="text-slate-400 hover:text-white p-0 h-auto font-normal cursor-pointer"
                      >
                        Log In
                      </Button>
                    </li>
                    <li>
                      <Button
                        variant="ghost"
                        onClick={() => handleNavigation("/signup")}
                        className="text-slate-400 hover:text-white p-0 h-auto font-normal cursor-pointer"
                      >
                        Sign Up
                      </Button>
                    </li>
                  </ul>
                </motion.div>

                {/* Page Links */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="footerCenterThree"
                >
                  <h3 className="text-white font-semibold text-lg mb-4">
                    Quick Links
                  </h3>
                  <ul className="space-y-2">
                    <li>
                      <Button
                        variant="ghost"
                        onClick={() => scrollToSection("About")}
                        className="text-slate-400 hover:text-white p-0 h-auto font-normal cursor-pointer"
                      >
                        About
                      </Button>
                    </li>
                    <li>
                      <Button
                        variant="ghost"
                        onClick={() => scrollToSection("Contact")}
                        className="text-slate-400 hover:text-white p-0 h-auto font-normal cursor-pointer"
                      >
                        Contact
                      </Button>
                    </li>
                  </ul>
                </motion.div>

                {/* Social Links */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="footerRight"
                >
                  <h3 className="text-white font-semibold text-lg mb-4">
                    Connect With Us
                  </h3>
                  <div className="socialIcons flex gap-3 flex-wrap">
                    <a
                      href="https://www.facebook.com/"
                      target="_blank"
                      className="w-10 h-10 rounded-full bg-slate-800 hover:bg-gradient-to-r hover:from-primaryColor hover:to-secondaryColor flex items-center justify-center transition-all cursor-pointer"
                    >
                      <i className="fa fa-facebook text-white"></i>
                    </a>
                    <a
                      href="https://www.instagram.com/"
                      target="_blank"
                      className="w-10 h-10 rounded-full bg-slate-800 hover:bg-gradient-to-r hover:from-primaryColor hover:to-secondaryColor flex items-center justify-center transition-all cursor-pointer"
                    >
                      <i className="fa fa-instagram text-white"></i>
                    </a>
                    <a
                      href="https://telegram.org/"
                      target="_blank"
                      className="w-10 h-10 rounded-full bg-slate-800 hover:bg-gradient-to-r hover:from-primaryColor hover:to-secondaryColor flex items-center justify-center transition-all cursor-pointer"
                    >
                      <i className="fa fa-telegram text-white"></i>
                    </a>
                    <a
                      href="https://www.x.com/"
                      target="_blank"
                      className="w-10 h-10 rounded-full bg-slate-800 hover:bg-gradient-to-r hover:from-primaryColor hover:to-secondaryColor flex items-center justify-center transition-all cursor-pointer"
                    >
                      <i className="fa fa-x text-white"></i>
                    </a>
                    <a
                      href="https://www.youtube.com/"
                      target="_blank"
                      className="w-10 h-10 rounded-full bg-slate-800 hover:bg-gradient-to-r hover:from-primaryColor hover:to-secondaryColor flex items-center justify-center transition-all cursor-pointer"
                    >
                      <i className="fa fa-youtube text-white"></i>
                    </a>
                  </div>
                </motion.div>
              </div>

              {/* Copyright */}
              <div className="border-t border-slate-800 pt-8 text-center">
                <p className="text-slate-500 text-sm">
                  © {new Date().getFullYear()} VibeMesh. All rights reserved.
                </p>
              </div>
            </div>
          </footer>
        </>
      ) : (
        <SplashScreen duration={2500} />
      )}
    </>
  );
};

export default HomePage;

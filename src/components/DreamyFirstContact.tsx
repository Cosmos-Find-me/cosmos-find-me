import React, { useState, useEffect } from 'react';
import { Sparkles, Star, FileText, Target, Upload, CheckCircle, Eye, X } from 'lucide-react';

interface DreamyFirstContactProps {
  onComplete: (resumeFile: File, cmfFile: File) => void;
}

const DreamyFirstContact: React.FC<DreamyFirstContactProps> = ({ onComplete }) => {
  const [step, setStep] = useState('welcome');
  const [showText, setShowText] = useState(false);
  const [showInteraction, setShowInteraction] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [cmfFile, setCmfFile] = useState<File | null>(null);
  const [showCMFGuide, setShowCMFGuide] = useState(false);
  const [sparkClicked, setSparkClicked] = useState(false);

  useEffect(() => {
    const textTimer = setTimeout(() => setShowText(true), 1500);
    const interactionTimer = setTimeout(() => setShowInteraction(true), 3000);
    
    return () => {
      clearTimeout(textTimer);
      clearTimeout(interactionTimer);
    };
  }, []);

  const handleFlameClick = () => {
    setSparkClicked(true);
    // Start explosion immediately on same screen, transition to upload after explosion
    setTimeout(() => setStep('upload'), 2000);
  };

  const handleFileUpload = (file: File | null, type: 'resume' | 'cmf') => {
    if (type === 'resume') {
      setResumeFile(file);
    } else {
      setCmfFile(file);
    }
  };

  const handleComplete = () => {
    if (resumeFile && cmfFile) {
      onComplete(resumeFile, cmfFile);
    }
  };

  const FloatingStars = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-pulse opacity-30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        >
          <Star className="w-2 h-2 text-blue-300 fill-current" />
        </div>
      ))}
    </div>
  );

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-y-auto" style={{ height: '100dvh', maxHeight: '100dvh' }}>
        <FloatingStars />
        
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="relative flex flex-col items-center justify-center min-h-screen px-4">
          <div 
            className="relative mb-8 cursor-pointer transition-transform duration-300"
            onClick={handleFlameClick}
          >
            {/* Explosion rings - shown behind the spark when clicked */}
            {sparkClicked && [1,2,3,4,5,6,7,8].map((_, i) => {
              const size = (i + 1) * 60;
              return (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%)`,
                    background: `linear-gradient(45deg, rgba(251, 146, 60, ${0.6 - i * 0.07}), rgba(139, 69, 19, ${0.4 - i * 0.05}))`,
                    animation: `explosionRing 1.5s ease-out ${i * 0.1}s 1 forwards`,
                    opacity: 0,
                    transformOrigin: 'center center',
                    zIndex: 1
                  }}
                />
              );
            })}
            
            <div className="absolute inset-0 scale-150 opacity-20 pointer-events-none" style={{ transform: 'translateZ(0)', willChange: 'opacity' }}>
              <div className="w-32 h-32 bg-gradient-to-r from-orange-400 via-purple-500 to-blue-500 rounded-full animate-pulse" />
            </div>
            
            <div className="absolute inset-0 scale-125 opacity-40 pointer-events-none" style={{ transform: 'translateZ(0)', willChange: 'opacity' }}>
              <div className="w-32 h-32 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 rounded-full animate-pulse" 
                   style={{ animationDelay: '0.5s', animationDuration: '3s' }} />
            </div>
            
            <div className="relative w-32 h-32 bg-gradient-to-br from-orange-300 via-pink-400 to-purple-500 rounded-full shadow-2xl z-10">
              <div className="absolute inset-2 bg-gradient-to-br from-yellow-200 via-orange-300 to-pink-400 rounded-full animate-pulse pointer-events-none" style={{ animationDuration: '2s', transform: 'translateZ(0)', willChange: 'opacity' }} />
              <div className="absolute inset-4 bg-gradient-to-br from-yellow-100 via-orange-200 to-yellow-300 rounded-full animate-pulse pointer-events-none" style={{ animationDelay: '1s', animationDuration: '4s', transform: 'translateZ(0)', willChange: 'opacity' }} />
              
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 pointer-events-none">
                <Sparkles className="w-6 h-6 text-yellow-200 animate-bounce" style={{ animationDelay: '2s' }} />
              </div>
              <div className="absolute -right-2 top-1/3 pointer-events-none">
                <Sparkles className="w-4 h-4 text-pink-200 animate-bounce" style={{ animationDelay: '1s' }} />
              </div>
              <div className="absolute -left-2 bottom-1/3 pointer-events-none">
                <Sparkles className="w-3 h-3 text-purple-200 animate-bounce" style={{ animationDelay: '3s' }} />
              </div>
            </div>
            
            {showInteraction && !sparkClicked && (
              <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-gradient-to-r from-orange-400 to-purple-500 pointer-events-none" />
            )}
            
            {/* Explosion particles - shown on the same screen */}
            {sparkClicked && Array.from({ length: 20 }).map((_, i) => {
              const angle = Math.random() * 2 * Math.PI;
              const distance = 50 + Math.random() * 150;
              const x = Math.cos(angle) * distance;
              const y = Math.sin(angle) * distance;
              return (
                <div
                  key={`particle-${i}`}
                  className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-bounce pointer-events-none"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(${x - 2}px, ${y - 2}px)`,
                    animationDelay: `${Math.random() * 1}s`,
                    animationDuration: `${1 + Math.random()}s`
                  }}
                />
              );
            })}
          </div>

          <div className={`text-center transition-opacity duration-1000 ${
            showText && !sparkClicked ? 'opacity-100' : 'opacity-0'
          }`}>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Welcome to your{' '}
              <span className="bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                career universe
              </span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl leading-relaxed">
              This is your spark of potential, waiting to illuminate the companies 
              that align with your dreams and ambitions.
            </p>
          </div>

          <div className={`text-center transition-all duration-1000 ${
            showInteraction && !sparkClicked ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
          }`}>
            <p className="text-lg text-blue-200 mb-6">
              Ready to discover your perfect company matches?
            </p>
            <div className="animate-bounce">
              <p className="text-sm text-blue-300 font-medium tracking-wide">
                ✨ Click your spark to begin the journey ✨
              </p>
            </div>
          </div>

          {/* Show universe awakening text during explosion */}
          <div className={`text-center mt-20 transition-opacity duration-1000 ${
            sparkClicked ? 'opacity-100' : 'opacity-0'
          }`}>
            <h2 className="text-3xl font-bold text-white opacity-80 animate-pulse">
              ✨ Your universe is awakening ✨
            </h2>
          </div>
          
          <div className={`absolute bottom-8 text-center transition-opacity duration-1000 delay-100 ${
            showInteraction && !sparkClicked ? 'opacity-60' : 'opacity-0'
          }`}>
            <p className="text-xs text-blue-400">
              Let's build your constellation of opportunities
            </p>
          </div>
        </div>

        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full opacity-5 blur-3xl animate-pulse" 
             style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500 rounded-full opacity-5 blur-3xl animate-pulse" 
             style={{ animationDelay: '3s', animationDuration: '6s' }} />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-pink-500 rounded-full opacity-5 blur-3xl animate-pulse" 
             style={{ animationDelay: '1s', animationDuration: '10s' }} />
      </div>
    );
  }

  if (step === 'transition') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-y-auto" style={{ height: '100dvh', maxHeight: '100dvh' }}>
        <FloatingStars />
        
        {/* Copy the exact same background elements as welcome screen */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="relative flex flex-col items-center justify-center min-h-screen px-4">
          {/* Explosion using EXACT same structure and positioning as the spark */}
          <div className="relative mb-8 cursor-pointer transition-transform duration-300">
            {/* Copy exact glow structure from welcome screen for perfect positioning */}
            <div className="absolute inset-0 scale-150 opacity-0">
              <div className="w-32 h-32 bg-gradient-to-r from-orange-400 via-purple-500 to-blue-500 rounded-full" />
            </div>
            
            <div className="absolute inset-0 scale-125 opacity-0">
              <div className="w-32 h-32 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 rounded-full" />
            </div>
            
            {/* Hidden spark for positioning reference - matches welcome screen exactly */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-orange-300 via-pink-400 to-purple-500 rounded-full shadow-2xl opacity-0 pointer-events-none">
              <div className="absolute inset-2 bg-gradient-to-br from-yellow-200 via-orange-300 to-pink-400 rounded-full opacity-0" />
              <div className="absolute inset-4 bg-gradient-to-br from-yellow-100 via-orange-200 to-yellow-300 rounded-full opacity-0" />
            </div>
            
            {/* Explosion rings positioned exactly like sparkles - relative to the spark */}
            {Array.from({ length: 8 }).map((_, i) => {
              const size = (i + 1) * 60;
              return (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%)`,
                    background: `linear-gradient(45deg, rgba(251, 146, 60, ${0.6 - i * 0.07}), rgba(139, 69, 19, ${0.4 - i * 0.05}))`,
                    animation: `explosionRing 1.5s ease-out ${i * 0.1}s 1 forwards`,
                    opacity: 0,
                    transformOrigin: 'center center'
                  }}
                />
              );
            })}
            
            {/* Particles positioned outside the hidden spark */}
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = Math.random() * 2 * Math.PI;
              const distance = 50 + Math.random() * 150;
              const x = Math.cos(angle) * distance;
              const y = Math.sin(angle) * distance;
              return (
                <div
                  key={`particle-${i}`}
                  className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-bounce pointer-events-none"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(${x - 2}px, ${y - 2}px)`, // -2px to center the 1px dot
                    animationDelay: `${Math.random() * 1}s`,
                    animationDuration: `${1 + Math.random()}s`
                  }}
                />
              );
            })}
          </div>

          <div className={`text-center transition-all duration-1000 opacity-0 transform translate-y-4`}>
            <p className="text-lg text-blue-200 mb-6">
              Ready to discover your perfect company matches?
            </p>
          </div>

          <div className={`absolute bottom-8 text-center transition-opacity duration-1000 delay-1000 opacity-0`}>
            <p className="text-xs text-blue-400">
              Let's build your constellation of opportunities
            </p>
          </div>
          
          <div className="text-center mt-20">
            <h2 className="text-3xl font-bold text-white opacity-80 animate-pulse">
              ✨ Your universe is awakening ✨
            </h2>
          </div>
        </div>

        {/* Copy the exact same ambient effects as welcome screen */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full opacity-5 blur-3xl animate-pulse" 
             style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500 rounded-full opacity-5 blur-3xl animate-pulse" 
             style={{ animationDelay: '3s', animationDuration: '6s' }} />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-pink-500 rounded-full opacity-5 blur-3xl animate-pulse" 
             style={{ animationDelay: '1s', animationDuration: '10s' }} />
      </div>
    );
  }

  if (step === 'upload') {
    const CosmicUploadZone = ({ type, title, description, icon: Icon, file, color }: {
      type: 'resume' | 'cmf';
      title: string;
      description: string;
      icon: React.ComponentType<React.ComponentProps<'svg'>>;
      file: File | null;
      color: 'blue' | 'purple';
    }) => {
      const colorClasses = {
        blue: 'from-blue-500/20 to-cyan-500/20 border-blue-400/30',
        purple: 'from-purple-500/20 to-pink-500/20 border-purple-400/30'
      };
      
      return (
        <div className={`
          relative p-8 rounded-2xl backdrop-blur-lg border-2 border-dashed transition-all duration-300 hover:scale-105
          ${file ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-400/40' : 
           `bg-gradient-to-br ${colorClasses[color]} hover:border-opacity-60`}
        `}>
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full opacity-40 animate-pulse"
                style={{
                  left: `${10 + i * 15}%`,
                  top: `${10 + (i % 3) * 30}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${2 + i * 0.3}s`
                }}
              />
            ))}
          </div>

          {file ? (
            <div className="text-center relative z-10">
              <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-200 mb-2">{file.name}</h3>
              <p className="text-green-300 mb-4">
                {(file.size / 1024 / 1024).toFixed(2)} MB • Collected successfully
              </p>
              <button
                onClick={() => handleFileUpload(null, type)}
                className="text-red-400 hover:text-red-300 font-medium transition-colors"
              >
                Remove from universe
              </button>
            </div>
          ) : (
            <div className="text-center relative z-10">
              <input
                id={`file-${type}`}
                type="file"
                className="hidden"
                accept={type === 'resume' ? '.pdf,.doc,.docx' : '.pdf,.doc,.docx,.md,.txt'}
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], type)}
              />
              <label htmlFor={`file-${type}`} className="cursor-pointer">
                <Icon className={`w-16 h-16 mx-auto mb-4 ${
                  color === 'blue' ? 'text-blue-300' : 'text-purple-300'
                }`} />
                <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
                <p className="text-gray-300 mb-6">{description}</p>
                <div className={`inline-flex items-center px-6 py-3 rounded-xl font-medium transition-all hover:scale-105 ${
                  color === 'blue' 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                }`}>
                  <Upload className="w-5 h-5 mr-2" />
                  Gather this element
                </div>
              </label>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-y-auto" style={{ height: '100dvh', maxHeight: '100dvh' }}>
        <FloatingStars />
        
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full opacity-5 blur-3xl animate-pulse" 
             style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500 rounded-full opacity-5 blur-3xl animate-pulse" 
             style={{ animationDelay: '3s', animationDuration: '6s' }} />

        <div className="relative max-w-6xl mx-auto py-12 px-4">
          <div className="text-center mb-16">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-300 to-purple-400 rounded-full mx-auto mb-6 animate-pulse" />
            <h1 className="text-4xl font-bold text-white mb-4">
              Building Your{' '}
              <span className="bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                Career Universe
              </span>
            </h1>
            <p className="text-xl text-blue-200 max-w-3xl mx-auto">
              Let's gather the cosmic elements needed to map your constellation of perfect company matches
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center text-blue-300 mb-4">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-bold">1</span>
                </div>
                <h2 className="text-2xl font-semibold text-white">Your Journey Map</h2>
              </div>
              
              <CosmicUploadZone
                type="resume"
                title="Professional Experience Archive"
                description="Share your career journey so far — your skills, experiences, and trajectory through the professional galaxy"
                icon={FileText}
                file={resumeFile}
                color="blue"
              />
              
              <p className="text-blue-300 text-sm text-center">
                ⭐ PDF, DOC, or DOCX • Max 10MB
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between text-purple-300 mb-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-bold">2</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-white">Your North Star</h2>
                </div>
                <button
                  onClick={() => setShowCMFGuide(true)}
                  className="text-purple-300 hover:text-purple-200 text-sm flex items-center bg-purple-500/10 px-3 py-2 rounded-lg transition-colors backdrop-blur-sm"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Guide
                </button>
              </div>
              
              <CosmicUploadZone
                type="cmf"
                title="Career Desires Constellation"
                description="Your personal manifesto of dreams, requirements, and values that will guide us to your perfect company matches"
                icon={Target}
                file={cmfFile}
                color="purple"
              />
              
              <p className="text-purple-300 text-sm text-center">
                ✨ PDF, DOC, DOCX, Markdown, or TXT • Max 5MB
              </p>
            </div>
          </div>

          <div className="text-center">
            {resumeFile && cmfFile ? (
              <button
                onClick={handleComplete}
                className="group relative inline-flex items-center px-12 py-4 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 text-white font-bold text-xl rounded-2xl hover:scale-105 transition-all duration-300 shadow-2xl"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 opacity-75 blur group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center">
                  <Sparkles className="w-8 h-8 mr-3 animate-spin" />
                  <span>Generate My Universe</span>
                  <div className="ml-3 flex space-x-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              </button>
            ) : (
              <div className="text-center">
                <p className="text-gray-400 mb-4">
                  Collect both cosmic elements to begin universe generation
                </p>
                <div className="flex justify-center space-x-4">
                  <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    resumeFile ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    <FileText className="w-4 h-4" />
                    <span>Journey Map</span>
                    {resumeFile && <CheckCircle className="w-4 h-4" />}
                  </div>
                  <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    cmfFile ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    <Target className="w-4 h-4" />
                    <span>North Star</span>
                    {cmfFile && <CheckCircle className="w-4 h-4" />}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {showCMFGuide && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-blue-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30 shadow-2xl">
              <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-blue-900 border-b border-purple-500/20 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">✨ Your North Star Guide</h2>
                <button
                  onClick={() => setShowCMFGuide(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 text-white">
                <div className="grid lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-purple-300">
                      🎯 What is a Career Fit Document?
                    </h3>
                    <p className="text-gray-300 mb-6">
                      Your personal manifesto that helps us find companies aligned with your values, goals, and requirements.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                        <h4 className="font-semibold text-red-300 mb-2">🔴 Must-Haves</h4>
                        <p className="text-red-200 text-sm">
                          Your non-negotiables. Companies missing these won't be good matches.
                        </p>
                      </div>
                      
                      <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                        <h4 className="font-semibold text-green-300 mb-2">💚 Want-to-Haves</h4>
                        <p className="text-green-200 text-sm">
                          Strong preferences that make roles exceptional.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-blue-300">
                      📄 Example Structure
                    </h3>
                    
                    <div className="bg-slate-800/50 rounded-lg p-4 text-sm font-mono border border-slate-600/30">
                      <div className="text-gray-300 space-y-2">
                        <p className="text-purple-300"># Your Career Goals</p>
                        <p><span className="text-blue-300">Target Role:</span> Senior PM roles</p>
                        <p className="text-red-300">## Must-Haves:</p>
                        <p className="text-xs">• High velocity execution</p>
                        <p className="text-xs">• Remote/flexible work</p>
                        <p className="text-green-300">## Want-to-Have:</p>
                        <p className="text-xs">• Platform strategy focus</p>
                        <p className="text-xs">• AI/ML innovation</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowCMFGuide(false)}
                      className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:scale-105 transition-transform"
                    >
                      Got it! Let's build my universe ✨
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default DreamyFirstContact;
import Image from "next/image";
import Link from "next/link";


const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 rounded-4xl shadow-gray-500 shadow-xl  from-slate-50 to-slate-100 p-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-800 mb-2">
          Welcome to WS Maintenance
        </h1>
        <p className="text-gray-600 text-lg">
          Choose your service platform
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-8 mt-8">
        <Link href="/WordPress" className="group">
          <button className="relative w-64 h-40 px-8 py-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 hover:border-blue-300">
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-14 h-14 flex items-center justify-center mb-3">
                <Image
                  src="/logo-image/wordpress-logo.png"
                  alt="WordPress Logo"
                  width={56}
                  height={56}
                  className="object-contain"
                />
              </div>
              <span className="text-xl font-semibold text-gray-800 group-hover:text-blue-700 transition-colors duration-300">
                WordPress
              </span>
              <span className="text-sm text-gray-500 mt-1">
                Content Management
              </span>
            </div>
          </button>
        </Link>

        <Link href="/Supportpal" className="group">
          <button className="relative w-64 h-40 px-8 py-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 hover:border-[#03558a]">
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-14 h-14 flex items-center justify-center mb-3">
                <Image
                  src="/logo-image/supportpal-logo.png"
                  alt="SupportPal Logo"
                  width={56}
                  height={56}
                  className="object-contain"
                />
              </div>
              <span className="text-xl font-semibold text-gray-800 group-hover:text-[#03558a] transition-colors duration-300">
                SupportPal
              </span>
              <span className="text-sm text-gray-500 mt-1">
                Help Desk System
              </span>
            </div>
          </button>
        </Link>
      </div>
      
      <div className="mt-16 text-center">
        <p className="text-gray-400 text-sm">
          ------------------------------------------
        </p>
      </div>
    </div>
  );
}


export default Home;
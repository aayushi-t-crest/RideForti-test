import { useState, useEffect, useRef, useCallback } from "react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Square, Calendar as CalendarIcon, Clock, X, ChevronDown, Navigation, Loader2, AlertCircle, Car, Truck, Shield, User, Users, Settings, Minus, Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import RouteMap from "@/components/RouteMap";
import WaitlistModal from "@/components/WaitlistModal";
import { useVehicleImages } from "@/hooks/useVehicleImages";



// Default SUV vehicle images (fallback)
import suvBlack from '@/assets/suv-black.png';
import suvBlackPlus from '@/assets/suv-black-plus.png';
import suvBlackX from '@/assets/suv-black-x.png';

// App store badges
import googlePlayBadge from '@/assets/google-play-badge.png';
import appStoreBadge from '@/assets/app-store-badge.svg';

// Time slots for the time picker
const generateTimeSlots = () => {
  const slots = [{
    value: "now",
    label: "Now"
  }];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const hourStr = hour.toString().padStart(2, "0");
      const minuteStr = minute.toString().padStart(2, "0");
      const period = hour < 12 ? "AM" : "PM";
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      slots.push({
        value: `${hourStr}:${minuteStr}`,
        label: `${displayHour}:${minuteStr} ${period}`
      });
    }
  }
  return slots;
};
const timeSlots = generateTimeSlots();
const floridaCities = [
// Northwest Florida (Panhandle)
{
  name: "Pensacola",
  state: "FL"
}, {
  name: "Destin",
  state: "FL"
}, {
  name: "Fort Walton Beach",
  state: "FL"
}, {
  name: "Crestview",
  state: "FL"
}, {
  name: "Panama City",
  state: "FL"
}, {
  name: "Panama City Beach",
  state: "FL"
}, {
  name: "Marianna",
  state: "FL"
},
// North Florida
{
  name: "Tallahassee",
  state: "FL"
}, {
  name: "Jacksonville",
  state: "FL"
}, {
  name: "Jacksonville Beach",
  state: "FL"
}, {
  name: "Atlantic Beach",
  state: "FL"
}, {
  name: "Neptune Beach",
  state: "FL"
}, {
  name: "St. Augustine",
  state: "FL"
}, {
  name: "Fernandina Beach",
  state: "FL"
}, {
  name: "Amelia Island",
  state: "FL"
}, {
  name: "Lake City",
  state: "FL"
}, {
  name: "Live Oak",
  state: "FL"
},
// North Central Florida
{
  name: "Gainesville",
  state: "FL"
}, {
  name: "Ocala",
  state: "FL"
}, {
  name: "Palm Coast",
  state: "FL"
}, {
  name: "Flagler Beach",
  state: "FL"
}, {
  name: "Palatka",
  state: "FL"
},
// Central Florida - East Coast
{
  name: "Daytona Beach",
  state: "FL"
}, {
  name: "Ormond Beach",
  state: "FL"
}, {
  name: "New Smyrna Beach",
  state: "FL"
}, {
  name: "Edgewater",
  state: "FL"
}, {
  name: "Titusville",
  state: "FL"
}, {
  name: "Cocoa",
  state: "FL"
}, {
  name: "Cocoa Beach",
  state: "FL"
}, {
  name: "Cape Canaveral",
  state: "FL"
}, {
  name: "Melbourne",
  state: "FL"
}, {
  name: "Palm Bay",
  state: "FL"
}, {
  name: "Sebastian",
  state: "FL"
}, {
  name: "Vero Beach",
  state: "FL"
}, {
  name: "Fort Pierce",
  state: "FL"
}, {
  name: "Port St. Lucie",
  state: "FL"
},
// Central Florida - Interior
{
  name: "Orlando",
  state: "FL"
}, {
  name: "Kissimmee",
  state: "FL"
}, {
  name: "Winter Park",
  state: "FL"
}, {
  name: "Sanford",
  state: "FL"
}, {
  name: "Altamonte Springs",
  state: "FL"
}, {
  name: "Apopka",
  state: "FL"
}, {
  name: "Ocoee",
  state: "FL"
}, {
  name: "Winter Garden",
  state: "FL"
}, {
  name: "Clermont",
  state: "FL"
}, {
  name: "Leesburg",
  state: "FL"
}, {
  name: "The Villages",
  state: "FL"
}, {
  name: "Lakeland",
  state: "FL"
}, {
  name: "Winter Haven",
  state: "FL"
}, {
  name: "Bartow",
  state: "FL"
}, {
  name: "Sebring",
  state: "FL"
}, {
  name: "Avon Park",
  state: "FL"
},
// Central Florida - West Coast (Tampa Bay Area)
{
  name: "Tampa",
  state: "FL"
}, {
  name: "St. Petersburg",
  state: "FL"
}, {
  name: "Clearwater",
  state: "FL"
}, {
  name: "Clearwater Beach",
  state: "FL"
}, {
  name: "Largo",
  state: "FL"
}, {
  name: "Dunedin",
  state: "FL"
}, {
  name: "Tarpon Springs",
  state: "FL"
}, {
  name: "Palm Harbor",
  state: "FL"
}, {
  name: "New Port Richey",
  state: "FL"
}, {
  name: "Brandon",
  state: "FL"
}, {
  name: "Riverview",
  state: "FL"
}, {
  name: "Plant City",
  state: "FL"
},
// Southwest Florida
{
  name: "Sarasota",
  state: "FL"
}, {
  name: "Siesta Key",
  state: "FL"
}, {
  name: "Bradenton",
  state: "FL"
}, {
  name: "Anna Maria Island",
  state: "FL"
}, {
  name: "Venice",
  state: "FL"
}, {
  name: "Englewood",
  state: "FL"
}, {
  name: "Punta Gorda",
  state: "FL"
}, {
  name: "Port Charlotte",
  state: "FL"
}, {
  name: "Fort Myers",
  state: "FL"
}, {
  name: "Fort Myers Beach",
  state: "FL"
}, {
  name: "Cape Coral",
  state: "FL"
}, {
  name: "Sanibel Island",
  state: "FL"
}, {
  name: "Captiva Island",
  state: "FL"
}, {
  name: "Bonita Springs",
  state: "FL"
}, {
  name: "Estero",
  state: "FL"
}, {
  name: "Naples",
  state: "FL"
}, {
  name: "Marco Island",
  state: "FL"
},
// Southeast Florida - Treasure Coast
{
  name: "Stuart",
  state: "FL"
}, {
  name: "Jensen Beach",
  state: "FL"
}, {
  name: "Hutchinson Island",
  state: "FL"
}, {
  name: "Jupiter",
  state: "FL"
}, {
  name: "Jupiter Island",
  state: "FL"
}, {
  name: "Juno Beach",
  state: "FL"
}, {
  name: "Palm Beach Gardens",
  state: "FL"
}, {
  name: "North Palm Beach",
  state: "FL"
}, {
  name: "West Palm Beach",
  state: "FL"
}, {
  name: "Palm Beach",
  state: "FL"
}, {
  name: "Lake Worth Beach",
  state: "FL"
}, {
  name: "Lantana",
  state: "FL"
}, {
  name: "Boynton Beach",
  state: "FL"
}, {
  name: "Delray Beach",
  state: "FL"
}, {
  name: "Highland Beach",
  state: "FL"
}, {
  name: "Boca Raton",
  state: "FL"
},
// Southeast Florida - Broward County (Lauderdale area)
{
  name: "Deerfield Beach",
  state: "FL"
}, {
  name: "Lighthouse Point",
  state: "FL"
}, {
  name: "Hillsboro Beach",
  state: "FL"
}, {
  name: "Pompano Beach",
  state: "FL"
}, {
  name: "Pompano Beach Highlands",
  state: "FL"
}, {
  name: "Lauderdale-by-the-Sea",
  state: "FL"
}, {
  name: "Sea Ranch Lakes",
  state: "FL"
}, {
  name: "Fort Lauderdale",
  state: "FL"
}, {
  name: "Lauderdale Lakes",
  state: "FL"
}, {
  name: "North Lauderdale",
  state: "FL"
}, {
  name: "Lauderdale Isles",
  state: "FL"
}, {
  name: "Wilton Manors",
  state: "FL"
}, {
  name: "Oakland Park",
  state: "FL"
}, {
  name: "Lauderhill",
  state: "FL"
}, {
  name: "Tamarac",
  state: "FL"
}, {
  name: "Sunrise",
  state: "FL"
}, {
  name: "Plantation",
  state: "FL"
}, {
  name: "Coral Springs",
  state: "FL"
}, {
  name: "Parkland",
  state: "FL"
}, {
  name: "Coconut Creek",
  state: "FL"
}, {
  name: "Margate",
  state: "FL"
}, {
  name: "Davie",
  state: "FL"
}, {
  name: "Cooper City",
  state: "FL"
}, {
  name: "Weston",
  state: "FL"
}, {
  name: "Southwest Ranches",
  state: "FL"
}, {
  name: "Pembroke Pines",
  state: "FL"
}, {
  name: "Pembroke Park",
  state: "FL"
}, {
  name: "Miramar",
  state: "FL"
}, {
  name: "Hollywood",
  state: "FL"
}, {
  name: "Dania Beach",
  state: "FL"
}, {
  name: "Hallandale Beach",
  state: "FL"
},
// Miami-Dade County
{
  name: "Aventura",
  state: "FL"
}, {
  name: "Golden Beach",
  state: "FL"
}, {
  name: "Sunny Isles Beach",
  state: "FL"
}, {
  name: "Bal Harbour",
  state: "FL"
}, {
  name: "Bay Harbor Islands",
  state: "FL"
}, {
  name: "Surfside",
  state: "FL"
}, {
  name: "Indian Creek",
  state: "FL"
}, {
  name: "Miami Beach",
  state: "FL"
}, {
  name: "North Bay Village",
  state: "FL"
}, {
  name: "North Miami Beach",
  state: "FL"
}, {
  name: "North Miami",
  state: "FL"
}, {
  name: "Biscayne Park",
  state: "FL"
}, {
  name: "Miami Shores",
  state: "FL"
}, {
  name: "El Portal",
  state: "FL"
}, {
  name: "Miami",
  state: "FL"
}, {
  name: "Miami Springs",
  state: "FL"
}, {
  name: "Virginia Gardens",
  state: "FL"
}, {
  name: "Medley",
  state: "FL"
}, {
  name: "Miami Gardens",
  state: "FL"
}, {
  name: "Opa-locka",
  state: "FL"
}, {
  name: "Hialeah",
  state: "FL"
}, {
  name: "Hialeah Gardens",
  state: "FL"
}, {
  name: "Miami Lakes",
  state: "FL"
}, {
  name: "Palm Springs North",
  state: "FL"
}, {
  name: "Doral",
  state: "FL"
}, {
  name: "Sweetwater",
  state: "FL"
}, {
  name: "Fontainebleau",
  state: "FL"
}, {
  name: "Westchester",
  state: "FL"
}, {
  name: "Coral Gables",
  state: "FL"
}, {
  name: "Coconut Grove",
  state: "FL"
}, {
  name: "Key Biscayne",
  state: "FL"
}, {
  name: "South Miami",
  state: "FL"
}, {
  name: "West Miami",
  state: "FL"
}, {
  name: "Coral Terrace",
  state: "FL"
}, {
  name: "University Park",
  state: "FL"
}, {
  name: "Pinecrest",
  state: "FL"
}, {
  name: "Palmetto Estates",
  state: "FL"
}, {
  name: "Kendall",
  state: "FL"
}, {
  name: "The Hammocks",
  state: "FL"
}, {
  name: "Tamiami",
  state: "FL"
}, {
  name: "Kendale Lakes",
  state: "FL"
}, {
  name: "Sunset",
  state: "FL"
}, {
  name: "Country Walk",
  state: "FL"
}, {
  name: "Richmond West",
  state: "FL"
}, {
  name: "Cutler Bay",
  state: "FL"
}, {
  name: "Palmetto Bay",
  state: "FL"
}, {
  name: "Lakes by the Bay",
  state: "FL"
}, {
  name: "Goulds",
  state: "FL"
}, {
  name: "Princeton",
  state: "FL"
}, {
  name: "Naranja",
  state: "FL"
}, {
  name: "Leisure City",
  state: "FL"
}, {
  name: "Homestead",
  state: "FL"
}, {
  name: "Florida City",
  state: "FL"
},
// Florida Keys
{
  name: "Key Largo",
  state: "FL"
}, {
  name: "Tavernier",
  state: "FL"
}, {
  name: "Islamorada",
  state: "FL"
}, {
  name: "Layton",
  state: "FL"
}, {
  name: "Marathon",
  state: "FL"
}, {
  name: "Big Pine Key",
  state: "FL"
}, {
  name: "Summerland Key",
  state: "FL"
}, {
  name: "Cudjoe Key",
  state: "FL"
}, {
  name: "Sugarloaf Key",
  state: "FL"
}, {
  name: "Stock Island",
  state: "FL"
}, {
  name: "Key West",
  state: "FL"
}];
interface AddressSuggestion {
  id: string;
  place_name: string;
  text: string;
  coordinates: [number, number]; // [lng, lat]
}
interface Coordinates {
  lng: number;
  lat: number;
}
// Vehicle types and experience options
type VehicleType = 'suv' | 'sedan' | null;
type RideExperience = 'black' | 'black-plus' | 'black-x' | null;
type DressPreference = 'civilian' | 'tactical' | 'suit' | null;

interface ExperienceOption {
  id: RideExperience;
  name: string;
  description: string;
  image?: string;
}

const sedanExperiences: ExperienceOption[] = [
  { id: 'black', name: 'Black', description: 'S Class, BMW 5 Series, Cadillac CTS-V or similar' },
  { id: 'black-plus', name: 'Black+', description: 'S Class Maybach, BMW 7 Series or similar' },
  { id: 'black-x', name: 'Black X', description: 'Bentley Flying Spur, Rolls Royce Phantom or similar' },
];


const suvExperiences: ExperienceOption[] = [
  { id: 'black', name: 'Black', description: 'GMC Suburban, Tahoe or similar', image: suvBlack },
  { id: 'black-plus', name: 'Black+', description: 'G63, Escalade, Lincoln Navigator or similar', image: suvBlackPlus },
  { id: 'black-x', name: 'Black X', description: 'Bentley Bentayga, Rolls Royce Cullinan, GLS 600 or similar', image: suvBlackX },
];

const RideBookingHero = () => {
  const isMobile = useIsMobile();
  const [city, setCity] = useState("Miami, FL");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupCoords, setPickupCoords] = useState<Coordinates | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<Coordinates | null>(null);
  
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Vehicle and experience selection (mobile/tablet only)
  const [vehicleType, setVehicleType] = useState<VehicleType>(null);
  const [rideExperience, setRideExperience] = useState<RideExperience>(null);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  
  // Armed guard options (mobile/tablet only)
  const [armedGuard, setArmedGuard] = useState<boolean | null>(null);
  const [showArmedGuardModal, setShowArmedGuardModal] = useState(false);
  const [dressPreference, setDressPreference] = useState<DressPreference>(null);
  const [showDressModal, setShowDressModal] = useState(false);
  const [guardCount, setGuardCount] = useState<number | null>(null);
  const [showGuardCountModal, setShowGuardCountModal] = useState(false);
  
  // Waitlist modal state
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);

  // Locked desktop form offset (lg+)
  const DESKTOP_FORM_OFFSET = 25;
  
  // Locked tablet form offset (md to lg)
  const TABLET_FORM_OFFSET = -13;

  // Dynamic vehicle images from database - using React Query for caching
  const { data: vehicleImages = {} } = useVehicleImages();

  // Helper to get image URL for a vehicle
  const getVehicleImageUrl = (vType: 'sedan' | 'suv', expLevel: string): string | undefined => {
    const key = `${vType}-${expLevel}`;
    return vehicleImages[key];
  };


  // Mobile wizard step tracking (0=VehicleType, 1=Pickup, 2=Dropoff, 3=ArmedGuard, 4=Dress, 5=GuardCount, 6=DateTime)
  const [mobileStep, setMobileStep] = useState(0);
  const totalMobileSteps = 7; // 0-6

  // ============================================
  // MOBILE LAYOUT CONFIG - Now controlled by dev tools
  // ============================================
  const paddingOptions = ["py-0.5", "py-1", "py-1.5", "py-2", "py-2.5", "py-3"];
  
  const [layoutConfig, setLayoutConfig] = useState({
    dotsOffset: -130,
    mapOffset: -160,
    buttonOffset: -190,
    buttonPadding: 1, // Index into paddingOptions (py-1)
  });

  // Per-step extra offsets (only for unlocked steps - locked steps use lockedStepOffsets)
  const stepOffsets: Record<number, number> = {
    // Steps 0-4 now use locked offsets, these are only fallbacks for unlocked steps
    6: 0,   // Date/Time step
  };

  // Locked offsets per step from user testing
  // Locked section spacing (gap between badges and How It Works) - mobile only
  const sectionSpacing = -155;
  
  // Locked badge sizes (height in pixels)
  const appStoreBadgeSize = 40;
  const googlePlayBadgeSize = 56;

  const lockedStepOffsets: Record<number, { dots: number; map: number; button: number; buttonPadding: number }> = {
    0: { dots: -110, map: -135, button: -165, buttonPadding: 3 }, // Vehicle Type
    1: { dots: -110, map: -135, button: -165, buttonPadding: 3 }, // Pickup
    2: { dots: -110, map: -135, button: -165, buttonPadding: 3 }, // Dropoff
    3: { dots: -90, map: -120, button: -155, buttonPadding: 3 },  // Armed Guard
    4: { dots: 5, map: -20, button: -50, buttonPadding: 3 },      // Dress Preference
    5: { dots: -65, map: -95, button: -130, buttonPadding: 1 },   // Number of Guards
    6: { dots: -65, map: -95, button: -135, buttonPadding: 1 },   // Date/Time
  };

  const mobileMapHeight = 500;
  
  // Get extra offset for current step
  const extraOffset = stepOffsets[mobileStep] || 0;
  
  // Calculate final offsets - Locked steps use fixed values, others use configurable base + step offset
  const lockedOffset = lockedStepOffsets[mobileStep];
  const mobileDotsOffset = lockedOffset ? lockedOffset.dots : layoutConfig.dotsOffset + extraOffset;
  const mobileMapOffset = lockedOffset ? lockedOffset.map : layoutConfig.mapOffset + extraOffset;
  const mobileButtonOffset = lockedOffset ? lockedOffset.button : layoutConfig.buttonOffset + extraOffset;
  
  // Get button padding class - Locked steps use fixed value
  const buttonPaddingIndex = lockedOffset ? lockedOffset.buttonPadding : layoutConfig.buttonPadding;
  const buttonPaddingY = paddingOptions[buttonPaddingIndex] || "py-1";

  // Swipe gesture tracking
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isRightSwipe && mobileStep > 0) {
      // Going back - if at pickup step (1) and going back to vehicle type (0), reset vehicle selection
      if (mobileStep === 1) {
        setVehicleType(null);
        setRideExperience(null);
      }
      setMobileStep(mobileStep - 1);
    }
    // Note: Left swipe to advance is disabled - user must select an address
  };
  // Fixed spacing above pickup bar (0px desktop, 16px mobile/tablet)

  // Date and Time states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("now");

  // Step-based reveal (for progressive flow)
  const currentStep = pickupCoords ? dropoffCoords ? 'complete' : 'dropoff' : 'pickup';

  // Autocomplete states
  const [pickupSuggestions, setPickupSuggestions] = useState<AddressSuggestion[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<AddressSuggestion[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);
  const [isLoadingPickup, setIsLoadingPickup] = useState(false);
  const [isLoadingDropoff, setIsLoadingDropoff] = useState(false);
  const pickupRef = useRef<HTMLDivElement>(null);
  const dropoffRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Lock body scroll when experience modal is open
  useEffect(() => {
    if (showExperienceModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showExperienceModal]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickupRef.current && !pickupRef.current.contains(event.target as Node)) {
        setShowPickupSuggestions(false);
      }
      if (dropoffRef.current && !dropoffRef.current.contains(event.target as Node)) {
        setShowDropoffSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const searchAddress = useCallback(async (query: string, type: "pickup" | "dropoff") => {
    if (query.length < 3) {
      if (type === "pickup") setPickupSuggestions([]);else setDropoffSuggestions([]);
      return;
    }
    if (type === "pickup") setIsLoadingPickup(true);else setIsLoadingDropoff(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("mapbox-geocode", {
        body: {
          query
        }
      });
      if (error) throw error;
      const suggestions = data.features?.map((f: any) => ({
        id: f.id,
        place_name: f.place_name,
        text: f.text,
        coordinates: f.center || f.geometry?.coordinates || [-80.1918, 25.7617]
      })) || [];
      if (type === "pickup") {
        setPickupSuggestions(suggestions);
        setShowPickupSuggestions(suggestions.length > 0);
      } else {
        setDropoffSuggestions(suggestions);
        setShowDropoffSuggestions(suggestions.length > 0);
      }
    } catch (error) {
      console.error("Address search error:", error);
    } finally {
      if (type === "pickup") setIsLoadingPickup(false);else setIsLoadingDropoff(false);
    }
  }, []);
  const handleInputChange = (value: string, type: "pickup" | "dropoff") => {
    if (type === "pickup") setPickup(value);else setDropoff(value);

    // Debounce the search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchAddress(value, type);
    }, 300);
  };
  const selectSuggestion = (suggestion: AddressSuggestion, type: "pickup" | "dropoff") => {
    // Validate that the address is in Florida
    const isFloridaAddress = suggestion.place_name.toLowerCase().includes('florida') || suggestion.place_name.includes(', FL');
    if (!isFloridaAddress) {
      toast.error("Only Florida locations are accepted. Please select a location in Florida.");
      return;
    }
    if (type === "pickup") {
      setPickup(suggestion.place_name);
      setPickupCoords({
        lng: suggestion.coordinates[0],
        lat: suggestion.coordinates[1]
      });
      setShowPickupSuggestions(false);
      setPickupSuggestions([]);
      // Advance to next step on mobile
      if (isMobile) {
        setMobileStep(2);
      }
    } else {
      setDropoff(suggestion.place_name);
      setDropoffCoords({
        lng: suggestion.coordinates[0],
        lat: suggestion.coordinates[1]
      });
      setShowDropoffSuggestions(false);
      setDropoffSuggestions([]);
      // Advance to armed guard step on mobile after dropoff
      if (isMobile) {
        setMobileStep(3);
      }
    }
  };

  // Handle vehicle type selection
  const handleVehicleTypeSelect = (type: VehicleType) => {
    setVehicleType(type);
    setShowExperienceModal(true);
  };

  // State to track which experience button is animating
  const [animatingExperience, setAnimatingExperience] = useState<RideExperience | null>(null);

  // Handle experience selection with shimmer delay
  const handleExperienceSelect = (experience: RideExperience) => {
    setAnimatingExperience(experience);
    // Wait for shimmer animation to complete before closing modal
    setTimeout(() => {
      setRideExperience(experience);
      setShowExperienceModal(false);
      setAnimatingExperience(null);
      setMobileStep(1); // Advance to pickup
    }, 500);
  };

  // Handle armed guard selection (inline step)
  const handleArmedGuardSelectStep = (hasGuard: boolean) => {
    setArmedGuard(hasGuard);
    if (hasGuard) {
      setMobileStep(4); // Go to dress preference
    } else {
      setMobileStep(6); // Skip to date/time
    }
  };

  // Handle dress preference selection (inline step)
  const handleDressSelectStep = (dress: DressPreference) => {
    setDressPreference(dress);
    setMobileStep(5); // Go to guard count
  };

  // Handle guard count selection (inline step)
  const handleGuardCountSelectStep = (count: number) => {
    setGuardCount(count);
    setMobileStep(6); // Advance to date/time
  };
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(async position => {
      const {
        latitude,
        longitude
      } = position.coords;

      // Check if location is roughly in Florida
      const isInFlorida = latitude >= 24.39 && latitude <= 31.01 && longitude >= -87.64 && longitude <= -79.97;
      if (!isInFlorida) {
        setLocationError("Service only available in Florida");
        toast.error("Our service is currently only available in Florida");
        setIsLocating(false);
        return;
      }
      try {
        const {
          data,
          error
        } = await supabase.functions.invoke("mapbox-geocode", {
          body: {
            query: `${longitude},${latitude}`,
            type: "reverse"
          }
        });
        if (error) throw error;
        if (data.features && data.features.length > 0) {
          setPickup(data.features[0].place_name);
          toast.success("Location found!");
        } else {
          // Fallback to coordinates
          setPickup(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
      } catch (error) {
        console.error("Reverse geocoding error:", error);
        // Fallback to basic coordinates
        setPickup(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        toast.info("Location found, but address lookup unavailable");
      }
      setIsLocating(false);
    }, error => {
      setIsLocating(false);
      let errorMessage = "Unable to get your location";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location permission denied. Please enable location access.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information unavailable";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out. Please try again.";
          break;
      }
      setLocationError(errorMessage);
      toast.error(errorMessage);
    }, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000
    });
  };
  const destinationSuggestions = [{
    name: "Miami International Airport",
    address: "2100 NW 42nd Ave, Miami, FL"
  }, {
    name: "Wynwood Walls",
    address: "2520 NW 2nd Ave, Miami, FL"
  }];
  return <section className="pt-28 pb-4 lg:pb-12 bg-background overflow-hidden" style={{ marginBottom: isMobile ? `${sectionSpacing}px` : undefined }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Left side - Form */}
          <div 
            className="space-y-2 order-1" 
            style={{ 
              transform: !isMobile ? `translateY(${window.innerWidth >= 1024 ? DESKTOP_FORM_OFFSET : TABLET_FORM_OFFSET}px)` : undefined 
            }}
          >

            {/* Title */}
            <h1 className="text-3xl sm:text-6xl font-bold text-foreground tracking-tight text-center mb-2">
              Let's Take a Ride
            </h1>

            {/* MOBILE: Horizontal Wizard Carousel (one step at a time) */}
            {isMobile ? <div className="relative z-20">
                {/* Carousel viewport with swipe gestures */}
                <div className="relative" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
                  {/* NOTE: this element has a CSS transform (translateX) which creates a new stacking context.
                      Keep z-index lower than dots so dots remain clickable, but dropdown will cover dots via visibility toggle */}
                  <div className="relative z-30 flex transition-transform duration-500 ease-out" style={{
                transform: `translateX(-${mobileStep * 100}%)`,
                width: '100%'
              }}>
                    {/* Step 0: Vehicle Type */}
                    <div className={`w-full shrink-0 ${mobileStep !== 0 ? 'invisible' : ''}`}>
                      <div className="flex gap-3 px-2">
                        <button
                          onClick={() => handleVehicleTypeSelect('sedan')}
                          className={`flex-1 ${buttonPaddingY} px-4 rounded-2xl border transition-all text-sm font-medium ${
                            vehicleType === 'sedan' 
                              ? 'border-white bg-secondary/20 text-foreground' 
                              : 'border-border/50 bg-secondary/20 text-foreground hover:border-border/70'
                          }`}
                        >
                          Sedan
                        </button>
                        <button
                          onClick={() => handleVehicleTypeSelect('suv')}
                          className={`flex-1 ${buttonPaddingY} px-4 rounded-2xl border transition-all text-sm font-medium ${
                            vehicleType === 'suv' 
                              ? 'border-white bg-secondary/20 text-foreground' 
                              : 'border-border/50 bg-secondary/20 text-foreground hover:border-border/70'
                          }`}
                        >
                          SUV
                        </button>
                      </div>
                    </div>

                    {/* Step 1: Pickup */}
                    <div className={`w-full shrink-0 px-2 ${mobileStep !== 1 ? 'invisible overflow-hidden' : 'overflow-visible'}`}>
                      <div ref={pickupRef} className="relative">
                        <div className="flex items-center border border-border/50 rounded-2xl bg-secondary/20 px-4 backdrop-blur-sm transition-all hover:border-border/70 focus-within:border-white" style={{
                      paddingTop: '4px',
                      paddingBottom: '4px'
                    }}>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full border-2 border-foreground flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                            </div>
                          </div>
                          <div className="flex-1 ml-3">
                            <Input value={pickup} onChange={e => handleInputChange(e.target.value, "pickup")} onFocus={() => pickup.length >= 3 && setShowPickupSuggestions(pickupSuggestions.length > 0)} placeholder="Pickup location" className="border-0 bg-transparent p-0 h-auto text-base text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground" />
                          </div>
                          <div className="flex items-center gap-1">
                            {isLoadingPickup && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
                            <button onClick={handleGetCurrentLocation} disabled={isLocating} className="h-8 w-8 p-0 flex items-center justify-center hover:bg-secondary rounded-full transition-colors disabled:opacity-50" title="Use current location">
                              {isLocating ? <Loader2 className="h-4 w-4 text-foreground animate-spin" /> : <Navigation className="h-4 w-4 text-foreground" fill="currentColor" />}
                            </button>
                            {pickup && <button onClick={() => {
                          setPickup("");
                          setPickupCoords(null);
                          setPickupSuggestions([]);
                        }} className="p-1 hover:bg-secondary rounded-full">
                                <X className="h-4 w-4 text-muted-foreground" />
                              </button>}
                          </div>
                        </div>
                        
                        {/* Pickup suggestions dropdown - solid bg + higher layer over dots */}
                        {showPickupSuggestions && pickupSuggestions.length > 0 && <div className="absolute left-0 right-0 top-full bg-popover text-popover-foreground border border-border rounded-xl shadow-lg z-[300] max-h-60 overflow-auto mt-1 animate-fade-in">
                            {pickupSuggestions.map(suggestion => <button key={suggestion.id} onClick={() => selectSuggestion(suggestion, "pickup")} className="w-full px-4 py-3 text-left hover:bg-foreground/10 transition-colors border-b border-border/50 last:border-0">
                                <div className="font-medium text-foreground text-sm">{suggestion.text}</div>
                                <div className="text-xs text-muted-foreground truncate">{suggestion.place_name}</div>
                              </button>)}
                          </div>}

                        {/* Location error */}
                        {locationError && <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-destructive/10 rounded-lg animate-fade-in">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <span className="text-sm text-destructive">{locationError}</span>
                          </div>}
                      </div>
                    </div>

                    {/* Step 2: Dropoff */}
                    <div className={`w-full shrink-0 px-2 ${mobileStep !== 2 ? 'invisible overflow-hidden' : 'overflow-visible'}`}>
                      <div ref={dropoffRef} className="relative">
                        <div className="flex items-center border border-border/50 rounded-2xl bg-secondary/20 px-4 backdrop-blur-sm transition-all hover:border-border/70 focus-within:border-white" style={{
                      paddingTop: '9px',
                      paddingBottom: '9px'
                    }}>
                          <div className="flex items-center gap-3">
                            <Square className="w-3 h-3 text-foreground" />
                          </div>
                          <div className="flex-1 ml-3">
                            <Input value={dropoff} onChange={e => handleInputChange(e.target.value, "dropoff")} onFocus={() => dropoff.length >= 3 && setShowDropoffSuggestions(dropoffSuggestions.length > 0)} placeholder="Dropoff location" className="border-0 bg-transparent p-0 h-auto text-base text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground" />
                          </div>
                          <div className="flex items-center gap-1">
                            {isLoadingDropoff && <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />}
                            {dropoff && <button onClick={() => {
                          setDropoff("");
                          setDropoffCoords(null);
                          setDropoffSuggestions([]);
                        }} className="p-1 hover:bg-secondary rounded-full">
                                <X className="h-4 w-4 text-muted-foreground" />
                              </button>}
                          </div>
                        </div>

                        {/* Dropoff suggestions dropdown - solid bg + higher layer over dots */}
                        {showDropoffSuggestions && dropoffSuggestions.length > 0 && <div className="absolute left-0 right-0 top-full bg-popover text-popover-foreground border border-border rounded-xl shadow-lg z-[300] max-h-60 overflow-auto mt-1 animate-fade-in">
                            {dropoffSuggestions.map(suggestion => <button key={suggestion.id} onClick={() => selectSuggestion(suggestion, "dropoff")} className="w-full px-4 py-3 text-left hover:bg-foreground/10 transition-colors border-b border-border/50 last:border-0">
                                <div className="font-medium text-foreground text-sm">{suggestion.text}</div>
                                <div className="text-xs text-muted-foreground truncate">{suggestion.place_name}</div>
                              </button>)}
                          </div>}
                      </div>
                    </div>

                    {/* Step 3: Armed Guard */}
                    <div className={`w-full shrink-0 px-2 ${mobileStep !== 3 ? 'invisible overflow-hidden' : ''}`}>
                      <div>
                        <label className="text-sm text-muted-foreground block mb-2">Armed Guard</label>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleArmedGuardSelectStep(false)}
                            className={`flex-1 ${buttonPaddingY} px-4 rounded-xl border transition-all text-sm font-medium ${
                              armedGuard === false 
                                ? 'border-white bg-secondary/20 text-foreground' 
                                : 'border-border/50 bg-secondary/20 text-foreground hover:border-border/70'
                            }`}
                          >
                            No
                          </button>
                          <button
                            onClick={() => handleArmedGuardSelectStep(true)}
                            className={`flex-1 ${buttonPaddingY} px-4 rounded-xl border transition-all text-sm font-medium ${
                              armedGuard === true 
                                ? 'border-white bg-secondary/20 text-foreground' 
                                : 'border-border/50 bg-secondary/20 text-foreground hover:border-border/70'
                            }`}
                          >
                            Yes
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Step 4: Dress Preference */}
                    <div className={`w-full shrink-0 px-2 ${mobileStep !== 4 ? 'invisible overflow-hidden' : ''}`}>
                      <div>
                        <label className="text-sm text-muted-foreground block mb-2">Dress Preference</label>
                        <div className="flex flex-col gap-2">
                          {[
                            { id: 'civilian' as DressPreference, label: 'Civilian' },
                            { id: 'tactical' as DressPreference, label: 'Tactical' },
                            { id: 'suit' as DressPreference, label: 'Suit' },
                          ].map((option) => (
                            <button
                              key={option.id}
                              onClick={() => handleDressSelectStep(option.id)}
                              className={`w-full ${buttonPaddingY} px-4 rounded-xl border transition-all text-sm font-medium ${
                                dressPreference === option.id 
                                  ? 'border-white bg-secondary/20 text-foreground' 
                                  : 'border-border/50 bg-secondary/20 text-foreground hover:border-border/70'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Step 5: Guard Count */}
                    <div className={`w-full shrink-0 px-2 ${mobileStep !== 5 ? 'invisible overflow-hidden' : ''}`}>
                      <div>
                        <label className="text-sm text-muted-foreground block mb-2">Number of Guards</label>
                        <div className="flex gap-3 justify-center">
                          {[1, 2, 3, 4].map((count) => (
                            <button
                              key={count}
                              onClick={() => handleGuardCountSelectStep(count)}
                              className={`w-12 h-10 rounded-xl border transition-all text-base font-bold ${
                                guardCount === count 
                                  ? 'border-white bg-secondary/20 text-foreground' 
                                  : 'border-border/50 bg-secondary/20 text-foreground hover:border-border/70'
                              }`}
                            >
                              {count === 4 ? '4+' : count}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Step 6: Date & Time */}
                    <div className={`w-full shrink-0 px-2 ${mobileStep !== 6 ? 'invisible overflow-hidden' : ''}`}>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Date Picker */}
                        <div>
                          <label className="text-sm text-muted-foreground block mb-2">Date</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="border border-border rounded-xl bg-secondary/30 px-4 text-left hover:bg-secondary/50 transition-colors w-full" style={{
                            paddingTop: '5px',
                            paddingBottom: '5px'
                          }}>
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                                  <span className="text-base font-medium text-foreground">
                                    {format(selectedDate, "MMM d") === format(new Date(), "MMM d") ? "Today" : format(selectedDate, "MMM d") === format(addDays(new Date(), 1), "MMM d") ? "Tomorrow" : format(selectedDate, "EEE, MMM d")}
                                  </span>
                                </div>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-secondary border-border" align="start">
                              <Calendar mode="single" selected={selectedDate} onSelect={date => date && setSelectedDate(date)} disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus className={cn("p-3 pointer-events-auto")} />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Time Picker */}
                        <div>
                          <label className="text-sm text-muted-foreground block mb-2">Time</label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="border border-border rounded-xl bg-secondary/30 px-4 text-left hover:bg-secondary/50 transition-colors w-full" style={{
                            paddingTop: '6px',
                            paddingBottom: '6px'
                          }}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-base font-medium text-foreground">
                                      {selectedTime === "now" ? "Now" : timeSlots.find(t => t.value === selectedTime)?.label || selectedTime}
                                    </span>
                                  </div>
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-48 bg-secondary border-border z-50" align="start">
                              <ScrollArea className="h-64">
                                {timeSlots.map(slot => (
                                  <DropdownMenuItem
                                    key={slot.value}
                                    onClick={() => setSelectedTime(slot.value)}
                                    className={cn(
                                      "cursor-pointer data-[highlighted]:bg-foreground data-[highlighted]:text-background focus:bg-foreground focus:text-background",
                                      selectedTime === slot.value && "bg-foreground text-background",
                                    )}
                                  >
                                    {slot.label}
                                  </DropdownMenuItem>
                                ))}
                              </ScrollArea>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step indicator dots - with adjustable offset, hidden when dropdown is showing */}
                <div 
                  className={`flex justify-center gap-2 mt-2 mb-2 relative z-[35] transition-opacity duration-150 ${
                    (showPickupSuggestions && pickupSuggestions.length > 0) || (showDropoffSuggestions && dropoffSuggestions.length > 0) 
                      ? 'opacity-0 pointer-events-none' 
                      : 'opacity-100'
                  }`}
                  style={{ transform: `translateY(${mobileDotsOffset}px)` }}
                >
                  {Array.from({ length: totalMobileSteps }, (_, step) => (
                    <button 
                      key={step} 
                      onClick={() => {
                        // Allow going back by clicking on completed dots
                        if (step < mobileStep) setMobileStep(step);
                      }} 
                      className={`h-2 rounded-full transition-all duration-300 ease-out transform ${
                        step === mobileStep 
                          ? 'bg-white w-4 scale-110' 
                          : step < mobileStep 
                            ? 'bg-white/60 w-2 cursor-pointer hover:bg-white/80 hover:scale-105' 
                            : 'bg-white/30 w-2'
                      }`} 
                    />
                  ))}
                </div>
              </div> : (/* DESKTOP/TABLET: Original stacked layout with all fields visible */
          <>
                {/* Location inputs - Progressive reveal */}
                <div className="space-y-4">
                  {/* Pickup - Always visible */}
                  <div ref={pickupRef} className="relative transition-all duration-300 ease-out">
                    <div className="flex items-center border border-border/50 rounded-2xl bg-secondary/20 px-4 backdrop-blur-sm transition-all hover:border-border/70 focus-within:border-white" style={{
                  paddingTop: '4px',
                  paddingBottom: '4px'
                }}>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full border-2 border-foreground flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 ml-3">
                        <Input value={pickup} onChange={e => handleInputChange(e.target.value, "pickup")} onFocus={() => pickup.length >= 3 && setShowPickupSuggestions(pickupSuggestions.length > 0)} placeholder="Pickup location" className="border-0 bg-transparent p-0 h-auto text-base text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-1">
                        {isLoadingPickup && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
                        <button onClick={handleGetCurrentLocation} disabled={isLocating} className="h-8 w-8 p-0 flex items-center justify-center hover:bg-secondary rounded-full transition-colors disabled:opacity-50" title="Use current location">
                          {isLocating ? <Loader2 className="h-4 w-4 text-foreground animate-spin" /> : <Navigation className="h-4 w-4 text-foreground" fill="currentColor" />}
                        </button>
                        {pickup && <button onClick={() => {
                      setPickup("");
                      setPickupCoords(null);
                      setPickupSuggestions([]);
                    }} className="p-1 hover:bg-secondary rounded-full">
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>}
                      </div>
                    </div>
                    
                    {/* Pickup suggestions dropdown */}
                    {showPickupSuggestions && pickupSuggestions.length > 0 && <div className="absolute left-0 right-0 top-full bg-popover text-popover-foreground border border-border rounded-xl shadow-lg z-[300] max-h-60 overflow-auto mt-1 animate-fade-in">
                        {pickupSuggestions.map(suggestion => <button key={suggestion.id} onClick={() => selectSuggestion(suggestion, "pickup")} className="w-full px-4 py-3 text-left hover:bg-foreground/10 transition-colors border-b border-border/50 last:border-0">
                            <div className="font-medium text-foreground text-sm">{suggestion.text}</div>
                            <div className="text-xs text-muted-foreground truncate">{suggestion.place_name}</div>
                          </button>)}
                      </div>}

                    {/* Location error */}
                    {locationError && <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-destructive/10 rounded-lg animate-fade-in">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive">{locationError}</span>
                      </div>}
                  </div>

                  {/* Dropoff - Always visible on desktop */}
                  <div ref={dropoffRef} className="relative transition-all duration-300 ease-out">
                    <div className="flex items-center border border-border/50 rounded-2xl bg-secondary/20 px-4 backdrop-blur-sm transition-all hover:border-border/70 focus-within:border-white" style={{
                  paddingTop: '9px',
                  paddingBottom: '9px'
                }}>
                      <div className="flex items-center gap-3">
                        <Square className="w-3 h-3 text-foreground" />
                      </div>
                      <div className="flex-1 ml-3">
                        <Input value={dropoff} onChange={e => handleInputChange(e.target.value, "dropoff")} onFocus={() => dropoff.length >= 3 && setShowDropoffSuggestions(dropoffSuggestions.length > 0)} placeholder="Dropoff location" className="border-0 bg-transparent p-0 h-auto text-base text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-1">
                        {isLoadingDropoff && <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />}
                        {dropoff && <button onClick={() => {
                      setDropoff("");
                      setDropoffCoords(null);
                      setDropoffSuggestions([]);
                    }} className="p-1 hover:bg-secondary rounded-full">
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>}
                      </div>
                    </div>

                    {/* Dropoff suggestions dropdown */}
                    {showDropoffSuggestions && dropoffSuggestions.length > 0 && <div className="absolute left-0 right-0 top-full bg-popover text-popover-foreground border border-border rounded-xl shadow-lg z-[300] max-h-60 overflow-auto mt-1 animate-fade-in">
                        {dropoffSuggestions.map(suggestion => <button key={suggestion.id} onClick={() => selectSuggestion(suggestion, "dropoff")} className="w-full px-4 py-3 text-left hover:bg-foreground/10 transition-colors border-b border-border/50 last:border-0">
                            <div className="font-medium text-foreground text-sm">{suggestion.text}</div>
                            <div className="text-xs text-muted-foreground truncate">{suggestion.place_name}</div>
                          </button>)}
                      </div>}
                  </div>
                </div>

                {/* Date and Time - Always visible on desktop */}
                <div className="grid grid-cols-2 gap-4 mt-3">
                  {/* Date Picker */}
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="border border-border rounded-xl bg-secondary/30 px-4 text-left hover:bg-secondary/50 transition-colors w-full" style={{
                      paddingTop: '5px',
                      paddingBottom: '5px'
                    }}>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                            <span className="text-base font-medium text-foreground">
                              {format(selectedDate, "MMM d") === format(new Date(), "MMM d") ? "Today" : format(selectedDate, "MMM d") === format(addDays(new Date(), 1), "MMM d") ? "Tomorrow" : format(selectedDate, "EEE, MMM d")}
                            </span>
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-secondary border-border" align="start">
                        <Calendar mode="single" selected={selectedDate} onSelect={date => date && setSelectedDate(date)} disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time Picker */}
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Time</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="border border-border rounded-xl bg-secondary/30 px-4 text-left hover:bg-secondary/50 transition-colors w-full" style={{
                      paddingTop: '6px',
                      paddingBottom: '6px'
                    }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="h-5 w-5 text-muted-foreground" />
                              <span className="text-base font-medium text-foreground">
                                {selectedTime === "now" ? "Now" : timeSlots.find(t => t.value === selectedTime)?.label || selectedTime}
                              </span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-48 bg-secondary border-border z-50" align="start">
                        <ScrollArea className="h-64">
                          {timeSlots.map(slot => (
                            <DropdownMenuItem
                              key={slot.value}
                              onClick={() => setSelectedTime(slot.value)}
                              className={cn(
                                "cursor-pointer data-[highlighted]:bg-foreground data-[highlighted]:text-background focus:bg-foreground focus:text-background",
                                selectedTime === slot.value && "bg-foreground text-background",
                              )}
                            >
                              {slot.label}
                            </DropdownMenuItem>
                          ))}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </>)}

            {/* See prices button - Tablet and Desktop */}
            {!isMobile && (
              <div className="flex flex-col items-center gap-4 mt-0 md:mt-12 lg:mt-0">
                <Link to="/waitlist" className="w-full">
                  <Button 
                    size="lg" 
                    className="w-full px-8 bg-red-600 hover:bg-red-700 text-white font-bold shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:shadow-[0_0_30px_rgba(239,68,68,0.7)] transition-all duration-300" 
                    disabled={!pickup || !dropoff}
                  >
                    See prices
                  </Button>
                </Link>
                
                {/* App Store Badges - Desktop only (lg+), hidden on tablet */}
                <div className="hidden lg:flex flex-col items-center gap-2 mt-2">
                  <p className="text-xs text-muted-foreground tracking-wide">Download Forti Now</p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setShowWaitlistModal(true)}>
                      <img 
                        src={appStoreBadge} 
                        alt="Download on the App Store" 
                        style={{ height: `${appStoreBadgeSize}px` }}
                        className="object-contain"
                      />
                    </button>
                    <button onClick={() => setShowWaitlistModal(true)}>
                      <img 
                        src={googlePlayBadge} 
                        alt="Get it on Google Play" 
                        style={{ height: `${googlePlayBadgeSize}px` }}
                        className="object-contain"
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Map - Show on tablet and desktop */}
          <div 
            className={`relative rounded-2xl overflow-hidden border border-border transition-all duration-300 order-2 md:mt-6 lg:mt-0 ${
              isMobile ? '' : 'h-[400px] md:h-[500px] md:min-h-[400px]'
            }`}
            style={{ 
              height: isMobile ? `${mobileMapHeight}px` : undefined,
              transform: isMobile ? `translateY(${mobileMapOffset}px)` : undefined 
            }}
          >
            {/* Interactive Leaflet Map with OSRM routing */}
            <RouteMap
              pickupCoords={pickupCoords}
              dropoffCoords={dropoffCoords}
              className="absolute inset-0"
            />
            
            {/* Location markers overlay */}
            {pickup && <div className="absolute bottom-24 left-4 z-20 animate-fade-in">
                <div className="bg-secondary/95 border border-border rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 backdrop-blur-sm">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-foreground whitespace-nowrap max-w-[180px] truncate">
                    {pickup.split(",")[0]}
                  </span>
                </div>
              </div>}
            
            {dropoff && <div className="absolute bottom-12 left-4 z-20 animate-fade-in">
                <div className="bg-secondary/95 border border-border rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 backdrop-blur-sm">
                  <Square className="h-3 w-3 text-red-500" />
                  <span className="text-sm font-medium text-foreground whitespace-nowrap max-w-[180px] truncate">
                    {dropoff.split(",")[0]}
                  </span>
                </div>
              </div>}
            
            {/* Route info badge */}
            
            {/* Layout is now automatically managed based on step */}
          </div>

          {/* App Store Badges - Tablet only (md to lg), shown under map */}
          {!isMobile && (
            <div className="flex lg:hidden flex-col items-center gap-2 mt-6 order-3 col-span-full">
              <p className="text-xs text-muted-foreground tracking-wide">Download Forti Now</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setShowWaitlistModal(true)}>
                  <img 
                    src={appStoreBadge} 
                    alt="Download on the App Store" 
                    style={{ height: `${appStoreBadgeSize}px` }}
                    className="object-contain"
                  />
                </button>
                <button onClick={() => setShowWaitlistModal(true)}>
                  <img 
                    src={googlePlayBadge} 
                    alt="Get it on Google Play" 
                    style={{ height: `${googlePlayBadgeSize}px` }}
                    className="object-contain"
                  />
                </button>
              </div>
            </div>
          )}
          
          {/* See prices button - Mobile, centered under map with adjustable offset */}
          {isMobile && (
            <div 
              className="flex flex-col items-center mt-4 order-3 col-span-1 gap-4"
              style={{ transform: `translateY(${mobileButtonOffset}px)` }}
            >
              <Button 
                size="lg" 
                className={`w-full max-w-md px-8 bg-red-600 hover:bg-red-700 text-white font-bold shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:shadow-[0_0_30px_rgba(239,68,68,0.7)] transition-all duration-500`} 
                disabled={!pickup || !dropoff}
                onClick={() => setShowWaitlistModal(true)}
              >
                See prices
              </Button>
              
              {/* App Store Badges - shifted down 20px */}
              <div className="flex flex-col items-center gap-2 mt-5">
                <p className="text-xs text-muted-foreground tracking-wide">Download Forti Now</p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => setShowWaitlistModal(true)}>
                    <img 
                      src={appStoreBadge} 
                      alt="Download on the App Store" 
                      style={{ height: `${appStoreBadgeSize}px` }}
                      className="object-contain"
                    />
                  </button>
                  <button onClick={() => setShowWaitlistModal(true)}>
                    <img 
                      src={googlePlayBadge} 
                      alt="Get it on Google Play" 
                      style={{ height: `${googlePlayBadgeSize}px` }}
                      className="object-contain"
                    />
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* Layout automatically adjusts based on step content */}
        </div>
        
      </div>


      {/* Modal Overlays - Mobile/Tablet Only */}
      {isMobile && (
        <>
          {/* Experience Selection Modal */}
          {showExperienceModal && (
            <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 overflow-hidden">
              {/* Dark overlay - prevents background interaction */}
              <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
                onClick={() => setShowExperienceModal(false)}
              />
              {/* Modal content - horizontal scrolling cards positioned near top */}
              <div className="relative z-10 w-full max-w-[90vw] animate-scale-in">
                <h3 className="text-xl font-bold text-foreground text-center mb-4">
                  Choose Your Experience
                </h3>
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 px-4 -mx-4 scrollbar-hide">
                  {(vehicleType === 'suv' ? suvExperiences : sedanExperiences).map((exp) => {
                    const vType = vehicleType as 'sedan' | 'suv';
                    const dynamicImageUrl = getVehicleImageUrl(vType, exp.id || '');
                    const fallbackImage = exp.image;
                    const displayImage = dynamicImageUrl || fallbackImage;
                    
                    return (
                      <div
                        key={exp.id}
                        className="flex-shrink-0 snap-center w-[280px] min-h-[300px] bg-black border border-border/50 rounded-2xl p-5 text-left flex flex-col"
                      >
                      {/* Car image - white background */}
                        <div className="w-full h-24 bg-white rounded-xl mb-3 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {displayImage ? (
                            <img
                              src={displayImage}
                              alt={`${vType} ${exp.name}`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-muted-foreground text-sm">No image</div>
                          )}
                        </div>
                        <h4 className="text-lg font-bold text-foreground mb-1">{exp.name}</h4>
                        <p className="text-sm text-muted-foreground flex-grow">{exp.description}</p>
                        {/* Select button with gradient and shimmer effect - fixed at bottom */}
                        <button
                          onClick={() => handleExperienceSelect(exp.id)}
                          className={`w-full py-2.5 px-4 rounded-xl font-bold text-black transition-all relative overflow-hidden btn-shimmer mt-auto ${animatingExperience === exp.id ? 'btn-shimmer-tap' : ''}`}
                          style={{
                            background: 'linear-gradient(135deg, hsl(0 0% 85%) 0%, hsl(0 0% 70%) 25%, hsl(0 0% 55%) 50%, hsl(0 0% 65%) 75%, hsl(0 0% 80%) 100%)',
                            boxShadow: 'inset 0 1px 0 0 hsl(0 0% 90%), inset 0 -1px 0 0 hsl(0 0% 40%), 0 2px 8px rgba(0,0,0,0.3)'
                          }}
                          disabled={animatingExperience !== null}
                        >
                          Select
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => setShowExperienceModal(false)}
                  className="absolute -top-2 right-0 p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          {/* Armed Guard, Dress, and Guard Count are now inline steps in mobile wizard */}
          
        </>
      )}
      
      {/* Waitlist Modal */}
      <WaitlistModal 
        open={showWaitlistModal} 
        onOpenChange={setShowWaitlistModal} 
      />
    </section>;
};
export default RideBookingHero;
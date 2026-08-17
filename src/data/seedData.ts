import { Product, Category } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'all',
    name: 'All Wholesale Categories',
    slug: 'all',
    description: 'Browse complete ready-to-dispatch inventory and bulk import lines',
    iconName: 'LayoutGrid',
    itemCount: 14
  },
  {
    id: 'solar',
    name: 'Solar & Renewable Energy',
    slug: 'solar',
    description: 'Commercial solar fans, hybrid inverters, solar generators, lithium packs & energy systems',
    iconName: 'SunMedium',
    itemCount: 2
  },
  {
    id: 'electronics',
    name: 'Electronics & Audio',
    slug: 'electronics',
    description: 'Solar inverters, power systems, ANC headphones, smart displays, smart home & peripherals',
    iconName: 'Cpu',
    itemCount: 3
  },
  {
    id: 'building',
    name: 'Building Materials & Hardware',
    slug: 'building',
    description: 'Contractor brushless power tools, safety helmets, structural fasteners, fixtures & security hardware',
    iconName: 'Wrench',
    itemCount: 3
  },
  {
    id: 'textiles',
    name: 'Textiles & Garments',
    slug: 'textiles',
    description: 'Bulk Swiss voile brocade, African wax Ankara prints, industrial uniform fabrics & accessories',
    iconName: 'Sparkles',
    itemCount: 2
  },
  {
    id: 'machinery',
    name: 'Machinery & Equipment',
    slug: 'machinery',
    description: '12-Ton hydraulic press systems, packaging strapping machines, heavy generators & processing tools',
    iconName: 'Factory',
    itemCount: 2
  },
  {
    id: 'packaging',
    name: 'General Merchandise & Packaging',
    slug: 'packaging',
    description: 'Heavy ECT-32 corrugated shipping cartons, pallet stretch wrap, industrial tape & bulk consumables',
    iconName: 'Package',
    itemCount: 2
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  // 1. ELECTRONICS & SOLAR / AUDIO
  {
    id: 'prod_ee_01',
    name: 'ApexPro Active Noise-Cancelling Wireless Headsets (Bulk Master Carton)',
    sku: 'EE-AUD-902',
    category: 'electronics',
    description: 'Premium enterprise-grade hybrid ANC wireless headphones with 45-hour battery life, dual omnidirectional noise-suppression microphones, and multi-device Bluetooth 5.3 pairing. Packaged for retail distribution across Nigeria and Cameroon with retail-ready packaging and barcode labeling.',
    price: 48.00,
    estimatedFreight: 25.00,
    wholesaleTiers: [
      { minQty: 10, pricePerUnit: 48.00, discountPercentage: 0 },
      { minQty: 50, pricePerUnit: 42.50, discountPercentage: 11 },
      { minQty: 200, pricePerUnit: 36.00, discountPercentage: 25 },
      { minQty: 500, pricePerUnit: 31.50, discountPercentage: 34 }
    ],
    stock: 1240,
    minOrderQty: 10,
    unit: 'Master Carton (10 Units)',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80'
    ],
    specs: {
      'Sourcing Origin': 'Shenzhen High-Tech Industrial Zone, China',
      'Battery Life': '45 Hours Playtime (USB-C Fast Charging)',
      'Connectivity': 'Bluetooth 5.3 + 3.5mm Aux backup',
      'Certifications': 'CE, FCC, RoHS, SONCAP Approved',
      'Warranty': '24-Month Manufacturer Wholesale Replacement',
      'Clearing Status': '100% Pre-cleared at Lagos Apapa & Douala Port'
    },
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 142,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString()
  },
  {
    id: 'prod_ee_06',
    name: 'OmniView 4K Ultra-HD Auto-Framing Conference Webcam System',
    sku: 'EE-AUD-501',
    category: 'electronics',
    description: 'Commercial video conferencing bar with 4K Sony CMOS sensor, 120-degree wide angle optical lens, AI facial auto-tracking, and integrated 5W beamforming speakerphone for commercial boardrooms, remote hubs, and government agencies.',
    price: 135.00,
    estimatedFreight: 20.00,
    wholesaleTiers: [
      { minQty: 4, pricePerUnit: 135.00, discountPercentage: 0 },
      { minQty: 20, pricePerUnit: 118.00, discountPercentage: 12 },
      { minQty: 60, pricePerUnit: 99.00, discountPercentage: 26 },
      { minQty: 150, pricePerUnit: 85.00, discountPercentage: 37 }
    ],
    stock: 310,
    minOrderQty: 4,
    unit: 'Carton (4 Enterprise Units)',
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800&auto=format&fit=crop&q=80'
    ],
    specs: {
      'Sourcing Origin': 'Dongguan Electronics Manufacturing Hub, China',
      'Resolution': '4K UHD @ 30fps / 1080p @ 60fps HDR',
      'Field of View': '120° Diagonal Ultra-Wide Distortion-Free',
      'Microphones': 'Quad MEMS Acoustic Array (8m Pickup Range)',
      'Mounting': 'Monitor Clip + 1/4" Tripod Brass Thread',
      'Local Stock': 'Ready in Lagos Trade Fair & Douala Akwa Depot'
    },
    isFeatured: false,
    rating: 4.9,
    reviewsCount: 29,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
  },
  {
    id: 'prod_ee_09',
    name: 'VoltMaster 5.5KVA Pure Sine Wave Hybrid Solar Inverter System',
    sku: 'EE-SOL-550',
    category: 'electronics',
    description: 'Industrial grade 5.5KVA 48V pure sine wave hybrid solar inverter with built-in 100A MPPT charge controller, dual AC outputs for smart load management, Wi-Fi remote monitoring module, and high-surge generator compatibility tailored for West African power grids.',
    price: 380.00,
    estimatedFreight: 45.00,
    wholesaleTiers: [
      { minQty: 2, pricePerUnit: 380.00, discountPercentage: 0 },
      { minQty: 10, pricePerUnit: 335.00, discountPercentage: 12 },
      { minQty: 30, pricePerUnit: 295.00, discountPercentage: 22 },
      { minQty: 100, pricePerUnit: 260.00, discountPercentage: 32 }
    ],
    stock: 145,
    minOrderQty: 2,
    unit: 'Wooden Crate (2 Heavy Inverters)',
    images: [
      'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=800&auto=format&fit=crop&q=80'
    ],
    specs: {
      'Rated Power': '5500W Continuous / 11000W Surge Peak',
      'Battery Voltage': '48VDC (Supports Lithium LiFePO4 & Gel Batteries)',
      'MPPT Solar Input': '120V - 500VDC Max PV Array',
      'Efficiency': '98% Peak Conversion Efficiency',
      'Warranty': '3-Year Manufacturer Wholesale Warranty',
      'Dispatch': 'Lagos Warehouses (Alaba / Trade Fair) & Douala Hub'
    },
    isFeatured: true,
    rating: 5.0,
    reviewsCount: 88,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
  },

  // 2. BUILDING MATERIALS & HARDWARE
  {
    id: 'prod_ee_02',
    name: 'Vortex Titanium 20V Cordless Brushless Drill & Impact Driver Set',
    sku: 'EE-IND-441',
    category: 'building',
    description: 'Heavy duty contractor grade 20V Max brushless combo kit. Delivers up to 650 in-lbs of torque with two 4.0Ah high-density lithium-ion batteries, fast smart charger, and rugged ballistics carrying case. Designed for high-volume trade contractors and hardware retailers in Nigeria & Cameroon.',
    price: 89.00,
    estimatedFreight: 30.00,
    wholesaleTiers: [
      { minQty: 5, pricePerUnit: 89.00, discountPercentage: 0 },
      { minQty: 25, pricePerUnit: 78.00, discountPercentage: 12 },
      { minQty: 100, pricePerUnit: 68.00, discountPercentage: 24 },
      { minQty: 300, pricePerUnit: 59.00, discountPercentage: 34 }
    ],
    stock: 680,
    minOrderQty: 5,
    unit: 'Case Pack (5 Combo Sets)',
    images: [
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&auto=format&fit=crop&q=80'
    ],
    specs: {
      'Sourcing Hub': 'Yongkang Hardware Capital & Ningbo Port, China',
      'Motor Type': 'Brushless High-Efficiency 20V',
      'Max Torque': '650 in-lbs (73.4 Nm)',
      'Included Batteries': '2x 20V 4.0Ah Lithium-Ion with charge gauge',
      'Chuck Size': '1/2-inch Heavy-Duty Metal Ratcheting',
      'Packaging': 'Heavy Duty Blow-Molded Case + Retail Sleeve'
    },
    isFeatured: true,
    rating: 4.8,
    reviewsCount: 89,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString()
  },
  {
    id: 'prod_ee_04',
    name: 'Guardian ANSI Type 1 Industrial Safety Helmets with Ratchet Harness',
    sku: 'EE-SAF-772',
    category: 'building',
    description: 'High-density polyethylene (HDPE) vented industrial hard hats with 6-point suspension nylon webbing and micro-adjust ratchet knob. Features universal accessory slots for earmuffs and face shields. Ideal for construction sites, logistics hubs, and manufacturing facilities across West Africa.',
    price: 14.50,
    estimatedFreight: 18.00,
    wholesaleTiers: [
      { minQty: 24, pricePerUnit: 14.50, discountPercentage: 0 },
      { minQty: 100, pricePerUnit: 11.80, discountPercentage: 18 },
      { minQty: 500, pricePerUnit: 9.20, discountPercentage: 36 },
      { minQty: 1500, pricePerUnit: 7.50, discountPercentage: 48 }
    ],
    stock: 3200,
    minOrderQty: 24,
    unit: 'Box (24 Units Mixed or Solid Colors)',
    images: [
      'https://images.unsplash.com/photo-1588620353536-ded12e518f45?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1578873375969-d71e3b6781f3?w=800&auto=format&fit=crop&q=80'
    ],
    specs: {
      'Standard Compliance': 'ANSI/ISEA Z89.1-2014 Type 1 Class C',
      'Suspension': '6-Point Ratchet Suspension Webbing',
      'Material': 'High-Impact Resistant Polyethylene',
      'Color Options': 'Safety Yellow, White, Blue, Hi-Vis Orange',
      'Minimum Order': '1 Master Box (24 Pieces)'
    },
    isFeatured: false,
    rating: 4.7,
    reviewsCount: 38,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString()
  },
  {
    id: 'prod_ee_10',
    name: 'TitanShield Commercial High-Security Steel Security Door Sets (960x2050mm)',
    sku: 'EE-BLD-810',
    category: 'building',
    description: 'Armored multi-lock anti-theft commercial security entrance doors. Heavy 1.2mm cold-rolled steel frame, 13-point multi-directional locking deadbolts, fire-resistant honeycomb core filling, and stainless steel sill plate. Shipped flat with pre-hung frames for real estate developers and building material merchants.',
    price: 145.00,
    estimatedFreight: 65.00,
    wholesaleTiers: [
      { minQty: 10, pricePerUnit: 145.00, discountPercentage: 0 },
      { minQty: 40, pricePerUnit: 125.00, discountPercentage: 14 },
      { minQty: 100, pricePerUnit: 108.00, discountPercentage: 25 },
      { minQty: 300, pricePerUnit: 92.00, discountPercentage: 36 }
    ],
    stock: 220,
    minOrderQty: 10,
    unit: 'Pallet Pack (10 Pre-Hung Door Units)',
    images: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&auto=format&fit=crop&q=80'
    ],
    specs: {
      'Sourcing Origin': 'Foshan & Yongkang Building Materials Zone, China',
      'Standard Dimensions': '960mm x 2050mm x 70mm Leaf Thickness',
      'Lock System': '13-Point Heavy Steel Anti-Drill Deadbolt Mechanism',
      'Finish': 'Heat-Transfer Woodgrain Anti-UV Polymer Coating',
      'Fulfillment': 'Direct Container Load (20ft = 140 Doors / 40ft HQ = 310 Doors)'
    },
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 45,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString()
  },

  // 3. TEXTILES & GARMENTS
  {
    id: 'prod_ee_11',
    name: 'Imperial Swiss Voile Brocade & Lace Fabric Rolls (50-Yard Master Bolts)',
    sku: 'EE-TEX-101',
    category: 'textiles',
    description: '100% combed Egyptian cotton luxury Swiss voile lace and brocade jacquard weave fabric. Features vibrant colorfast dyeing, intricate metallic embroidery patterns, and soft breathable finish. Highly demanded across Nigerian traditional wedding seasons and Cameroonian ceremonial markets.',
    price: 95.00,
    estimatedFreight: 22.00,
    wholesaleTiers: [
      { minQty: 5, pricePerUnit: 95.00, discountPercentage: 0 },
      { minQty: 25, pricePerUnit: 82.00, discountPercentage: 14 },
      { minQty: 80, pricePerUnit: 69.00, discountPercentage: 27 },
      { minQty: 250, pricePerUnit: 58.00, discountPercentage: 39 }
    ],
    stock: 540,
    minOrderQty: 5,
    unit: 'Master Bale (5x 50-Yard Fabric Rolls)',
    images: [
      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80'
    ],
    specs: {
      'Sourcing Origin': 'Shaoxing Keqiao Textile City (Zhejiang, China)',
      'Material Composition': '100% Fine Combed Cotton 80s/2 Voile',
      'Width': '51/52 inches (130 cm)',
      'Packaging': 'Bale wrapped in waterproof poly-sheeting and nylon strapping',
      'Markets Supplied': 'Lagos Balogun, Onitsha Main Market, Douala Central Market'
    },
    isFeatured: true,
    rating: 5.0,
    reviewsCount: 76,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString()
  },
  {
    id: 'prod_ee_12',
    name: 'GoldenWax Authentic Premium Cotton African Wax Ankara Fabric (6-Yard Bundles)',
    sku: 'EE-TEX-204',
    category: 'textiles',
    description: '100% premium grade cotton block-printed African wax Ankara fabric. Double-sided color penetration, anti-fading reactive dyes, and authentic traditional and contemporary African geometric motifs. Sold in bales of 100 pieces for commercial textile merchants.',
    price: 8.50,
    estimatedFreight: 15.00,
    wholesaleTiers: [
      { minQty: 50, pricePerUnit: 8.50, discountPercentage: 0 },
      { minQty: 200, pricePerUnit: 7.20, discountPercentage: 15 },
      { minQty: 800, pricePerUnit: 5.90, discountPercentage: 30 },
      { minQty: 2500, pricePerUnit: 4.80, discountPercentage: 43 }
    ],
    stock: 4800,
    minOrderQty: 50,
    unit: 'Bale (50x 6-Yard Pieces Assorted)',
    images: [
      'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80'
    ],
    specs: {
      'Fabric Length': '6 Yards (5.48 meters) per piece',
      'Yarn Count': '40s x 40s High Density Pure Cotton',
      'Print Technique': 'Double Sided Real Wax Emulsion',
      'Assortment': 'Top 10 Fast-Selling Patterns in West Africa'
    },
    isFeatured: false,
    rating: 4.8,
    reviewsCount: 51,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString()
  },

  // 4. MACHINERY & INDUSTRIAL EQUIPMENT
  {
    id: 'prod_ee_07',
    name: 'HydroMax Commercial 12-Ton Hydraulic Shop Press & Gauge',
    sku: 'EE-IND-890',
    category: 'machinery',
    description: 'Heavy gauge welded steel H-frame shop press designed for bearing removal, bushing pressing, metal bending, and automotive fabrication workshops. Includes multi-position bed pins, dual pressing plates, and liquid-filled pressure readout gauge.',
    price: 245.00,
    estimatedFreight: 85.00,
    wholesaleTiers: [
      { minQty: 2, pricePerUnit: 245.00, discountPercentage: 0 },
      { minQty: 10, pricePerUnit: 215.00, discountPercentage: 12 },
      { minQty: 30, pricePerUnit: 189.00, discountPercentage: 23 },
      { minQty: 80, pricePerUnit: 165.00, discountPercentage: 32 }
    ],
    stock: 95,
    minOrderQty: 2,
    unit: 'Crated Pallet (2 Units)',
    images: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'
    ],
    specs: {
      'Sourcing Origin': 'Zibo & Wuxi Machinery Industrial Park, China',
      'Capacity': '12 Metric Tons (24,000 lbs)',
      'Working Distance': '2" to 36" Multi-level Adjustable Bed',
      'Ram Stroke': '6.8 inches (175mm)',
      'Total Weight': '145 lbs per unit crated',
      'Local Delivery': 'Kano Bompai Depot & Lagos Alaba Logistics Node'
    },
    isFeatured: false,
    rating: 4.8,
    reviewsCount: 17,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString()
  },
  {
    id: 'prod_ee_13',
    name: 'PackMaster Industrial Automatic Carton Box Strapping & Sealing Machine',
    sku: 'EE-MAC-402',
    category: 'machinery',
    description: 'High-speed semi-automatic strapping and continuous carton taping machine engineered for logistics depots, agro-exporters, and manufacturing assembly lines. Straps up to 30 cartons per minute with heat-sealed polypropylene tension bands.',
    price: 320.00,
    estimatedFreight: 110.00,
    wholesaleTiers: [
      { minQty: 1, pricePerUnit: 320.00, discountPercentage: 0 },
      { minQty: 5, pricePerUnit: 285.00, discountPercentage: 11 },
      { minQty: 20, pricePerUnit: 245.00, discountPercentage: 23 },
      { minQty: 50, pricePerUnit: 210.00, discountPercentage: 34 }
    ],
    stock: 42,
    minOrderQty: 1,
    unit: 'Heavy Crate (1 Industrial Machine)',
    images: [
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800&auto=format&fit=crop&q=80'
    ],
    specs: {
      'Strapping Speed': '1.5 seconds / strap cycle',
      'Power Supply': '220V / 50Hz (Pure Copper Industrial Motor)',
      'Table Height': '750mm Ergonomic Work Surface',
      'Band Width': '9mm to 15mm Polypropylene Strapping Tape',
      'Warranty': '24-Month Parts Replacement Guarantee'
    },
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 22,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
  },

  // 5. GENERAL MERCHANDISE & PACKAGING
  {
    id: 'prod_ee_05',
    name: 'UltraPack Multi-Wall 200# Corrugated Shipping Boxes (12x10x8 Inch)',
    sku: 'EE-PKG-330',
    category: 'packaging',
    description: 'Heavy duty ECT-32 test single-wall brown kraft shipping cartons. Shipped flat in bundled packs of 100. Perfect for e-commerce fulfillment warehouses, third-party logistics centers, and retail shipping operations across Nigeria and Cameroon.',
    price: 0.85,
    estimatedFreight: 20.00,
    wholesaleTiers: [
      { minQty: 100, pricePerUnit: 0.85, discountPercentage: 0 },
      { minQty: 500, pricePerUnit: 0.68, discountPercentage: 20 },
      { minQty: 2000, pricePerUnit: 0.52, discountPercentage: 38 },
      { minQty: 5000, pricePerUnit: 0.41, discountPercentage: 51 }
    ],
    stock: 18500,
    minOrderQty: 100,
    unit: 'Bundle (100 Flat-Folded Boxes)',
    images: [
      'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'
    ],
    specs: {
      'Dimensions': '12" x 10" x 8" (30.5 x 25.4 x 20.3 cm)',
      'Strength Rating': '32 lb Edge Crush Test (ECT-32)',
      'Recycled Content': '100% Recyclable FSC-Certified Kraft',
      'Flute Grade': 'C-Flute Structural Strength',
      'Container Fit': '40ft Container Holds 45,000 Flat Boxes'
    },
    isFeatured: false,
    rating: 4.8,
    reviewsCount: 52,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
  },
  {
    id: 'prod_ee_03',
    name: 'ErgoComfort Executive Mesh Task Chair with 4D Armrests',
    sku: 'EE-OFC-108',
    category: 'packaging',
    description: 'Commercial high-back breathable mesh office chair engineered for 12+ hours continuous commercial use. Features synchronous tilt-lock mechanism, adjustable lumbar curvature, and Class-4 heavy duty gas lift tested to 350 lbs BIFMA compliance.',
    price: 115.00,
    estimatedFreight: 35.00,
    wholesaleTiers: [
      { minQty: 8, pricePerUnit: 115.00, discountPercentage: 0 },
      { minQty: 40, pricePerUnit: 98.00, discountPercentage: 15 },
      { minQty: 120, pricePerUnit: 84.00, discountPercentage: 27 },
      { minQty: 250, pricePerUnit: 74.00, discountPercentage: 36 }
    ],
    stock: 450,
    minOrderQty: 8,
    unit: 'Pallet Tier (8 Units Knock-Down)',
    images: [
      'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=800&auto=format&fit=crop&q=80'
    ],
    specs: {
      'Sourcing Origin': 'Foshan Furniture Industrial Belt, Guangdong, China',
      'Weight Capacity': '350 lbs (158 kg) BIFMA X5.1 Certified',
      'Base Material': 'Reinforced Polished Aluminum 5-Star Base',
      'Mechanism': 'Multi-angle Synchronous Dynamic Recline Lock',
      'Mesh Type': 'High Elasticity Polymer Breathable Mesh'
    },
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 64,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString()
  },
  {
    id: 'prod_ee_08',
    name: 'FlexiDesk Dual-Motor Electric Height Adjustable Standing Frame',
    sku: 'EE-OFC-612',
    category: 'packaging',
    description: 'Heavy duty commercial motorized dual-motor desk legs with programmable LED digital memory handset, anti-collision sensor, and expandable crossbar accommodating 48" to 78" tabletops. Ideal for corporate fit-outs and furniture retailers.',
    price: 168.00,
    estimatedFreight: 40.00,
    wholesaleTiers: [
      { minQty: 6, pricePerUnit: 168.00, discountPercentage: 0 },
      { minQty: 30, pricePerUnit: 145.00, discountPercentage: 13 },
      { minQty: 100, pricePerUnit: 124.00, discountPercentage: 26 },
      { minQty: 250, pricePerUnit: 108.00, discountPercentage: 35 }
    ],
    stock: 380,
    minOrderQty: 6,
    unit: 'Bulk Pack (6 Metal Frame Sets)',
    images: [
      'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&auto=format&fit=crop&q=80'
    ],
    specs: {
      'Lift Speed': '1.5 inches / second whisper quiet (<45dB)',
      'Load Rating': '330 lbs (150 kg) Static & Dynamic',
      'Height Range': '24.5" to 50.2" (62cm - 128cm)',
      'Presets': '4-Memory User Position Profiles'
    },
    isFeatured: false,
    rating: 4.9,
    reviewsCount: 71,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  }
];

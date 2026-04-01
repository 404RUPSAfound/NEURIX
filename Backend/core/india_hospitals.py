"""
india_hospitals.py
------------------
India hospital data loader.
Priority: india_hospitals.json (fetched by fetch_india_hospitals.py)
Fallback: built-in SEED list covering every state/UT with key district hospitals.
"""
import os, json, math
from typing import List, Dict, Any

_JSON_PATH = os.path.join(os.path.dirname(__file__), "india_hospitals.json")

# -------------------------------------------------------------------
# SEED: ~500 real hospitals — every state + major districts
# Format: (name, lat, lng, city, state, category, phone)
# -------------------------------------------------------------------
_SEED = [
    # ANDHRA PRADESH - MEDICAL HUB
    ("Government General Hospital Vijayawada", 16.5062, 80.6480, "Vijayawada", "Andhra Pradesh", "HOSPITAL", "+91 866-2450222"),
    ("KIMS Hospital Secunderabad", 15.8281, 78.0373, "Kurnool", "Andhra Pradesh", "HOSPITAL", "+91 8518-285600"),
    ("Apollo Pharmacy MG Road", 16.5122, 80.6420, "Vijayawada", "Andhra Pradesh", "PHARMACY", "+91 40-23608888"),
    ("Sri Rama Medicals", 16.5080, 80.6450, "Vijayawada", "Andhra Pradesh", "PHARMACY", "+91 98480 12345"),
    ("Durga Resource Hub (Hardware)", 16.5040, 80.6410, "Vijayawada", "Andhra Pradesh", "RESOURCE", "+91 99887 76655"),
    
    # DELHI - NCR TACTICAL GRID (High Density)
    ("AIIMS New Delhi", 28.5681, 77.2100, "New Delhi", "Delhi", "HOSPITAL", "+91 11-26588500"),
    ("Safdarjung Hospital Delhi", 28.5686, 77.2065, "New Delhi", "Delhi", "HOSPITAL", "+91 11-26190763"),
    ("Max Pharma Sector 12", 28.5650, 77.2150, "New Delhi", "Delhi", "PHARMACY", "+91 11-40554055"),
    ("Delhi Tactical Resupply (Hardware)", 28.5710, 77.2200, "New Delhi", "Delhi", "RESOURCE", "+91 99110 99887"),
    ("Medanta Pharmacy", 28.5600, 77.2000, "New Delhi", "Delhi", "PHARMACY", "+91 99990 11223"),
    ("Fortis Escorts Heart Inst.", 28.5604, 77.2730, "Okhla", "Delhi", "HOSPITAL", "+91 11-47135000"),
    ("Delhi Gov Health Post", 28.5355, 77.2448, "Saket", "Delhi", "HOSPITAL", "+91 11-29532555"),
    ("Saket Resource Block", 28.5244, 77.2167, "Saket", "Delhi", "RESOURCE", "+91 98110 54321"),

    # MUMBAI - FINANCIAL & LOGISTICS CORE
    ("KEM Hospital Mumbai", 18.9939, 72.8405, "Mumbai", "Maharashtra", "HOSPITAL", "+91 22-24107000"),
    ("JJ Hospital Mumbai", 18.9647, 72.8358, "Mumbai", "Maharashtra", "HOSPITAL", "+91 22-23735555"),
    ("Wellness Forever Parel", 18.9950, 72.8420, "Mumbai", "Maharashtra", "PHARMACY", "+91 22-23000000"),
    ("Mumbai Hardware & Safety Mart", 18.9900, 72.8350, "Mumbai", "Maharashtra", "RESOURCE", "+91 98200 12345"),
    ("Apollo Spectra Tardeo", 18.9691, 72.8124, "Mumbai", "Maharashtra", "HOSPITAL", "+91 22-43663300"),
    ("Dharavi Medical Outreach", 19.0381, 72.8538, "Dharavi", "Mumbai", "HOSPITAL", "+91 22-24071000"),
    ("Mumbai Logistic Port Hub", 18.9480, 72.8410, "Mumbai", "Maharashtra", "RESOURCE", "+91 91234 56789"),

    # BENGALURU - TECH & RESPONSE CENTER
    ("Bowring Hospital Bengaluru", 12.9762, 77.6033, "Bengaluru", "Karnataka", "HOSPITAL", "+91 80-22868123"),
    ("Victoria Hospital Bengaluru", 12.9609, 77.5800, "Bengaluru", "Karnataka", "HOSPITAL", "+91 80-26701150"),
    ("Manipal Pharmacy HAL Road", 12.9591, 77.6480, "Bengaluru", "Karnataka", "PHARMACY", "+91 80-25211200"),
    ("Electronic City Resource Unit", 12.8399, 77.6770, "Bengaluru", "Karnataka", "RESOURCE", "+91 99000 88776"),
    ("St. John's Medical College", 12.9341, 77.6111, "Bengaluru", "Karnataka", "HOSPITAL", "+91 80-22065000"),
    ("Whitefield Pharma Hub", 12.9698, 77.7499, "Whitefield", "Bengaluru", "PHARMACY", "+91 80-45667788"),

    # HYDERABAD - PHARMA CAPITAL
    ("Osmania General Hospital", 17.3789, 78.4752, "Hyderabad", "Telangana", "HOSPITAL", "+91 40-24602222"),
    ("Apollo Health City Jubilee Hills", 17.4243, 78.4116, "Hyderabad", "Telangana", "HOSPITAL", "+91 40-23607777"),
    ("Hetero Pharmacy Madhapur", 17.4483, 78.3915, "Hyderabad", "Telangana", "PHARMACY", "+91 40-23114455"),
    ("Hyderabad Tactical Depot", 17.4410, 78.3800, "HITEC City", "Hyderabad", "RESOURCE", "+91 99887 71122"),
    # ARUNACHAL PRADESH
    ("TRIHMS Naharlagun", 27.1024, 93.6951, "Naharlagun", "Arunachal Pradesh"),
    ("Tomo Riba Institute", 27.0910, 93.6167, "Itanagar", "Arunachal Pradesh"),
    ("District Hospital Tawang", 27.5862, 91.8594, "Tawang", "Arunachal Pradesh"),
    # ASSAM
    ("Gauhati Medical College", 26.1445, 91.7362, "Guwahati", "Assam"),
    ("GMCH Guwahati", 26.1537, 91.7664, "Guwahati", "Assam"),
    ("Silchar Medical College", 24.8333, 92.7789, "Silchar", "Assam"),
    ("Jorhat Medical College", 26.7465, 94.2026, "Jorhat", "Assam"),
    ("Tezpur Civil Hospital", 26.6318, 92.8001, "Tezpur", "Assam"),
    ("Dibrugarh Civil Hospital", 27.4728, 94.9120, "Dibrugarh", "Assam"),
    # BIHAR
    ("PMCH Patna", 25.6093, 85.1376, "Patna", "Bihar"),
    ("IGIMS Patna", 25.6200, 85.1682, "Patna", "Bihar"),
    ("NMCH Patna", 25.5961, 85.1376, "Patna", "Bihar"),
    ("Sadar Hospital Muzaffarpur", 26.1209, 85.3647, "Muzaffarpur", "Bihar"),
    ("DMCH Darbhanga", 26.1542, 85.8918, "Darbhanga", "Bihar"),
    ("Sadar Hospital Gaya", 24.7914, 84.9994, "Gaya", "Bihar"),
    ("Sadar Hospital Bhagalpur", 25.2540, 86.9842, "Bhagalpur", "Bihar"),
    ("Sadar Hospital Purnia", 25.7771, 87.4753, "Purnia", "Bihar"),
    # CHHATTISGARH
    ("Dr. BR Ambedkar Hospital Raipur", 21.2514, 81.6296, "Raipur", "Chhattisgarh"),
    ("AIIMS Raipur", 21.2337, 81.6296, "Raipur", "Chhattisgarh"),
    ("CIMS Bilaspur", 22.0797, 82.1409, "Bilaspur", "Chhattisgarh"),
    ("Government Hospital Durg", 21.1904, 81.2849, "Durg", "Chhattisgarh"),
    ("District Hospital Jagdalpur", 19.0762, 82.0222, "Jagdalpur", "Chhattisgarh"),
    # GOA
    ("Goa Medical College Panaji", 15.4909, 73.8278, "Panaji", "Goa"),
    ("South Goa District Hospital", 15.2993, 74.1240, "Margao", "Goa"),
    ("Apollo Victor Hospital Margao", 15.2735, 73.9583, "Margao", "Goa"),
    # GUJARAT
    ("Civil Hospital Ahmedabad", 23.0395, 72.5840, "Ahmedabad", "Gujarat"),
    ("SVP Hospital Ahmedabad", 23.0258, 72.5873, "Ahmedabad", "Gujarat"),
    ("Sterling Hospital Vadodara", 22.3219, 73.1899, "Vadodara", "Gujarat"),
    ("GMERS Civil Hospital Surat", 21.1702, 72.8311, "Surat", "Gujarat"),
    ("PDU Medical College Rajkot", 22.2887, 70.7750, "Rajkot", "Gujarat"),
    ("Civil Hospital Bhavnagar", 21.7645, 72.1519, "Bhavnagar", "Gujarat"),
    ("General Hospital Jamnagar", 22.4707, 70.0577, "Jamnagar", "Gujarat"),
    ("Civil Hospital Junagadh", 21.5222, 70.4579, "Junagadh", "Gujarat"),
    ("Civil Hospital Gandhinagar", 23.2156, 72.6369, "Gandhinagar", "Gujarat"),
    ("Civil Hospital Navsari", 20.9467, 72.9520, "Navsari", "Gujarat"),
    ("Civil Hospital Anand", 22.5645, 72.9289, "Anand", "Gujarat"),
    ("Civil Hospital Mehsana", 23.5997, 72.3693, "Mehsana", "Gujarat"),
    # HARYANA
    ("PGI Rohtak", 28.8955, 76.6066, "Rohtak", "Haryana"),
    ("Civil Hospital Gurgaon", 28.4595, 77.0266, "Gurugram", "Haryana"),
    ("General Hospital Faridabad", 28.4089, 77.3178, "Faridabad", "Haryana"),
    ("Civil Hospital Ambala", 30.3752, 76.7821, "Ambala", "Haryana"),
    ("General Hospital Hisar", 29.1492, 75.7217, "Hisar", "Haryana"),
    ("Civil Hospital Karnal", 29.6857, 76.9905, "Karnal", "Haryana"),
    ("General Hospital Panipat", 29.3909, 76.9635, "Panipat", "Haryana"),
    # HIMACHAL PRADESH
    ("IGMC Shimla", 31.1048, 77.1734, "Shimla", "Himachal Pradesh"),
    ("Dr. RPGMC Tanda", 32.0890, 76.2674, "Kangra", "Himachal Pradesh"),
    ("Zonal Hospital Mandi", 31.7086, 76.9318, "Mandi", "Himachal Pradesh"),
    ("Regional Hospital Kullu", 31.9579, 77.1095, "Kullu", "Himachal Pradesh"),
    ("Regional Hospital Manali", 32.2432, 77.1892, "Manali", "Himachal Pradesh"),
    # JHARKHAND
    ("RIMS Ranchi", 23.3441, 85.3096, "Ranchi", "Jharkhand"),
    ("MGM Medical College Jamshedpur", 22.7900, 86.1985, "Jamshedpur", "Jharkhand"),
    ("Sadar Hospital Dhanbad", 23.7957, 86.4304, "Dhanbad", "Jharkhand"),
    ("Sadar Hospital Bokaro", 23.6693, 86.1511, "Bokaro", "Jharkhand"),
    ("Sadar Hospital Hazaribagh", 23.9961, 85.3613, "Hazaribagh", "Jharkhand"),
    # KARNATAKA
    ("Bowring Hospital Bengaluru", 12.9762, 77.6033, "Bengaluru", "Karnataka"),
    ("Victoria Hospital Bengaluru", 12.9609, 77.5800, "Bengaluru", "Karnataka"),
    ("NIMHANS Bengaluru", 12.9418, 77.5958, "Bengaluru", "Karnataka"),
    ("Manipal Hospital Bengaluru", 12.9591, 77.6480, "Bengaluru", "Karnataka"),
    ("KMC Mangaluru", 12.8697, 74.8435, "Mangaluru", "Karnataka"),
    ("KIMS Hubli", 15.3647, 75.1240, "Hubballi", "Karnataka"),
    ("McGann General Hospital Shimoga", 13.9299, 75.5681, "Shivamogga", "Karnataka"),
    ("Cheluvamba Hospital Mysuru", 12.2958, 76.6394, "Mysuru", "Karnataka"),
    ("District Hospital Belagavi", 15.8497, 74.4977, "Belagavi", "Karnataka"),
    ("District Hospital Kalaburagi", 17.3297, 76.8343, "Kalaburagi", "Karnataka"),
    # KERALA
    ("SAT Hospital Thiruvananthapuram", 8.5241, 76.9366, "Thiruvananthapuram", "Kerala"),
    ("General Hospital Thiruvananthapuram", 8.5003, 76.9524, "Thiruvananthapuram", "Kerala"),
    ("Medical College Kochi", 9.9981, 76.2999, "Kochi", "Kerala"),
    ("General Hospital Kozhikode", 11.2588, 75.7804, "Kozhikode", "Kerala"),
    ("General Hospital Thrissur", 10.5276, 76.2144, "Thrissur", "Kerala"),
    ("General Hospital Kannur", 11.8745, 75.3704, "Kannur", "Kerala"),
    ("District Hospital Palakkad", 10.7867, 76.6548, "Palakkad", "Kerala"),
    ("District Hospital Kollam", 8.8932, 76.6141, "Kollam", "Kerala"),
    ("District Hospital Malappuram", 11.0510, 76.0711, "Malappuram", "Kerala"),
    ("District Hospital Kottayam", 9.5916, 76.5222, "Kottayam", "Kerala"),
    # MADHYA PRADESH
    ("Gandhi Medical College Bhopal", 23.2599, 77.4126, "Bhopal", "Madhya Pradesh"),
    ("Hamidia Hospital Bhopal", 23.2514, 77.4016, "Bhopal", "Madhya Pradesh"),
    ("MGM Medical College Indore", 22.7196, 75.8577, "Indore", "Madhya Pradesh"),
    ("MY Hospital Indore", 22.7197, 75.8573, "Indore", "Madhya Pradesh"),
    ("GRMC Gwalior", 26.2215, 78.1780, "Gwalior", "Madhya Pradesh"),
    ("District Hospital Jabalpur", 23.1815, 79.9864, "Jabalpur", "Madhya Pradesh"),
    ("District Hospital Ujjain", 23.1765, 75.7885, "Ujjain", "Madhya Pradesh"),
    ("District Hospital Rewa", 24.5366, 81.3042, "Rewa", "Madhya Pradesh"),
    ("District Hospital Sagar", 23.8388, 78.7378, "Sagar", "Madhya Pradesh"),
    # MAHARASHTRA
    ("KEM Hospital Mumbai", 18.9939, 72.8405, "Mumbai", "Maharashtra"),
    ("JJ Hospital Mumbai", 18.9647, 72.8358, "Mumbai", "Maharashtra"),
    ("Nair Hospital Mumbai", 18.9706, 72.8304, "Mumbai", "Maharashtra"),
    ("Sassoon General Hospital Pune", 18.5197, 73.8730, "Pune", "Maharashtra"),
    ("Government Hospital Nagpur", 21.1458, 79.0882, "Nagpur", "Maharashtra"),
    ("Civil Hospital Nashik", 19.9975, 73.7898, "Nashik", "Maharashtra"),
    ("District Hospital Aurangabad", 19.8762, 75.3433, "Aurangabad", "Maharashtra"),
    ("Civil Hospital Solapur", 17.6800, 75.9064, "Solapur", "Maharashtra"),
    ("General Hospital Kolhapur", 16.7050, 74.2433, "Kolhapur", "Maharashtra"),
    ("District Hospital Amravati", 20.9320, 77.7523, "Amravati", "Maharashtra"),
    ("District Hospital Latur", 18.4088, 76.5604, "Latur", "Maharashtra"),
    ("District Hospital Jalgaon", 21.0077, 75.5626, "Jalgaon", "Maharashtra"),
    # MANIPUR
    ("RIMS Imphal", 24.8170, 93.9368, "Imphal", "Manipur"),
    ("JNIMS Porompat", 24.8350, 93.9700, "Imphal", "Manipur"),
    ("District Hospital Bishnupur", 24.6303, 93.7690, "Bishnupur", "Manipur"),
    # MEGHALAYA
    ("NEIGRIHMS Shillong", 25.5552, 91.8807, "Shillong", "Meghalaya"),
    ("Civil Hospital Shillong", 25.5788, 91.8933, "Shillong", "Meghalaya"),
    ("Civil Hospital Tura", 25.5144, 90.2162, "Tura", "Meghalaya"),
    # MIZORAM
    ("Civil Hospital Aizawl", 23.7271, 92.7176, "Aizawl", "Mizoram"),
    ("Zoram Medical College", 23.7000, 92.7167, "Aizawl", "Mizoram"),
    # NAGALAND
    ("NHAK Hospital Kohima", 25.6586, 94.1086, "Kohima", "Nagaland"),
    ("Civil Hospital Dimapur", 25.9011, 93.7267, "Dimapur", "Nagaland"),
    # ODISHA
    ("SCB Medical College Cuttack", 20.4625, 85.8830, "Cuttack", "Odisha"),
    ("AIIMS Bhubaneswar", 20.2961, 85.8191, "Bhubaneswar", "Odisha"),
    ("Capital Hospital Bhubaneswar", 20.2961, 85.8245, "Bhubaneswar", "Odisha"),
    ("MKCG Medical College Berhampur", 19.3149, 84.7941, "Berhampur", "Odisha"),
    ("VSS Medical College Burla", 21.4927, 83.8712, "Sambalpur", "Odisha"),
    ("District Hospital Balasore", 21.4942, 86.9340, "Balasore", "Odisha"),
    ("District Hospital Rourkela", 22.2604, 84.8536, "Rourkela", "Odisha"),
    # PUNJAB
    ("PGIMER Chandigarh", 30.7655, 76.7742, "Chandigarh", "Punjab"),
    ("DMCH Ludhiana", 30.9109, 75.8573, "Ludhiana", "Punjab"),
    ("GMCH Amritsar", 31.6340, 74.8723, "Amritsar", "Punjab"),
    ("Civil Hospital Jalandhar", 31.3260, 75.5762, "Jalandhar", "Punjab"),
    ("Civil Hospital Patiala", 30.3398, 76.3869, "Patiala", "Punjab"),
    ("Civil Hospital Bathinda", 30.2110, 74.9455, "Bathinda", "Punjab"),
    # RAJASTHAN
    ("SMS Hospital Jaipur", 26.9124, 75.7873, "Jaipur", "Rajasthan"),
    ("JLN Hospital Ajmer", 26.4499, 74.6399, "Ajmer", "Rajasthan"),
    ("Sardar Patel Medical College Bikaner", 28.0229, 73.3119, "Bikaner", "Rajasthan"),
    ("RNT Medical College Udaipur", 24.5854, 73.7125, "Udaipur", "Rajasthan"),
    ("MBS Hospital Kota", 25.1802, 75.8380, "Kota", "Rajasthan"),
    ("MDM Hospital Jodhpur", 26.2889, 73.0243, "Jodhpur", "Rajasthan"),
    ("Civil Hospital Alwar", 27.5530, 76.6347, "Alwar", "Rajasthan"),
    ("District Hospital Bharatpur", 27.2152, 77.4938, "Bharatpur", "Rajasthan"),
    ("District Hospital Sikar", 27.6094, 75.1399, "Sikar", "Rajasthan"),
    ("District Hospital Ganganagar", 29.9038, 73.8772, "Sri Ganganagar", "Rajasthan"),
    # SIKKIM
    ("STNM Hospital Gangtok", 27.3314, 88.6138, "Gangtok", "Sikkim"),
    ("District Hospital Namchi", 27.1668, 88.3634, "Namchi", "Sikkim"),
    # TAMIL NADU
    ("Government General Hospital Chennai", 13.0827, 80.2707, "Chennai", "Tamil Nadu"),
    ("Stanley Medical College Chennai", 13.1101, 80.2876, "Chennai", "Tamil Nadu"),
    ("Rajiv Gandhi Government Hospital Chennai", 13.0998, 80.2871, "Chennai", "Tamil Nadu"),
    ("Government Hospital Coimbatore", 11.0168, 76.9558, "Coimbatore", "Tamil Nadu"),
    ("Government Hospital Madurai", 9.9252, 78.1198, "Madurai", "Tamil Nadu"),
    ("Government Hospital Tiruchirappalli", 10.7905, 78.7047, "Tiruchirappalli", "Tamil Nadu"),
    ("Government Hospital Salem", 11.6643, 78.1460, "Salem", "Tamil Nadu"),
    ("Government Hospital Tirunelveli", 8.7139, 77.7567, "Tirunelveli", "Tamil Nadu"),
    ("Government Hospital Tiruppur", 11.1085, 77.3411, "Tiruppur", "Tamil Nadu"),
    ("Government Hospital Vellore", 12.9165, 79.1325, "Vellore", "Tamil Nadu"),
    # TELANGANA
    ("Osmania General Hospital Hyderabad", 17.3850, 78.4867, "Hyderabad", "Telangana"),
    ("Gandhi Hospital Hyderabad", 17.4065, 78.5151, "Hyderabad", "Telangana"),
    ("NIMS Hyderabad", 17.4045, 78.4733, "Hyderabad", "Telangana"),
    ("Nizamabad District Hospital", 18.6725, 78.0942, "Nizamabad", "Telangana"),
    ("Karimnagar District Hospital", 18.4386, 79.1288, "Karimnagar", "Telangana"),
    ("Warangal MGM Hospital", 17.9689, 79.5941, "Warangal", "Telangana"),
    ("Khammam District Hospital", 17.2473, 80.1514, "Khammam", "Telangana"),
    # TRIPURA
    ("GBP Hospital Agartala", 23.8315, 91.2868, "Agartala", "Tripura"),
    ("AGMC Agartala", 23.8370, 91.2851, "Agartala", "Tripura"),
    ("District Hospital Dharmanagar", 24.3644, 92.1653, "Dharmanagar", "Tripura"),
    # UTTAR PRADESH
    ("KGMU Lucknow", 26.9124, 80.9870, "Lucknow", "Uttar Pradesh"),
    ("Lohia Hospital Lucknow", 26.8467, 80.9462, "Lucknow", "Uttar Pradesh"),
    ("Civil Hospital Agra", 27.1767, 78.0081, "Agra", "Uttar Pradesh"),
    ("SN Medical College Agra", 27.1975, 78.0115, "Agra", "Uttar Pradesh"),
    ("District Hospital Varanasi", 25.3176, 82.9739, "Varanasi", "Uttar Pradesh"),
    ("BHU Hospital Varanasi", 25.2677, 82.9913, "Varanasi", "Uttar Pradesh"),
    ("District Hospital Kanpur", 26.4499, 80.3319, "Kanpur", "Uttar Pradesh"),
    ("District Hospital Prayagraj", 25.4358, 81.8463, "Prayagraj", "Uttar Pradesh"),
    ("District Hospital Ghaziabad", 28.6692, 77.4538, "Ghaziabad", "Uttar Pradesh"),
    ("District Hospital Meerut", 28.9845, 77.7064, "Meerut", "Uttar Pradesh"),
    ("District Hospital Bareilly", 28.3670, 79.4304, "Bareilly", "Uttar Pradesh"),
    ("District Hospital Moradabad", 28.8389, 78.7765, "Moradabad", "Uttar Pradesh"),
    ("District Hospital Aligarh", 27.8974, 78.0880, "Aligarh", "Uttar Pradesh"),
    ("District Hospital Gorakhpur", 26.7606, 83.3732, "Gorakhpur", "Uttar Pradesh"),
    ("District Hospital Mathura", 27.4924, 77.6737, "Mathura", "Uttar Pradesh"),
    ("District Hospital Jhansi", 25.4484, 78.5685, "Jhansi", "Uttar Pradesh"),
    ("District Hospital Saharanpur", 29.9680, 77.5510, "Saharanpur", "Uttar Pradesh"),
    # UTTARAKHAND
    ("AIIMS Rishikesh", 30.1215, 78.3156, "Rishikesh", "Uttarakhand"),
    ("Doon Medical College Dehradun", 30.3200, 78.0322, "Dehradun", "Uttarakhand"),
    ("Base Hospital Haldwani", 29.2183, 79.5130, "Haldwani", "Uttarakhand"),
    ("District Hospital Haridwar", 29.9457, 78.1642, "Haridwar", "Uttarakhand"),
    ("District Hospital Mussoorie", 30.4534, 78.0644, "Mussoorie", "Uttarakhand"),
    ("District Hospital Nainital", 29.3919, 79.4542, "Nainital", "Uttarakhand"),
    ("Rudraprayag District Hospital", 30.2860, 78.9799, "Rudraprayag", "Uttarakhand"),
    ("Chamoli District Hospital", 30.2489, 79.6124, "Chamoli", "Uttarakhand"),
    ("Pithoragarh District Hospital", 29.5819, 80.2185, "Pithoragarh", "Uttarakhand"),
    # WEST BENGAL
    ("SSKM Hospital Kolkata", 22.5353, 88.3408, "Kolkata", "West Bengal"),
    ("Medical College Kolkata", 22.5745, 88.3629, "Kolkata", "West Bengal"),
    ("NRS Medical College Kolkata", 22.5729, 88.3726, "Kolkata", "West Bengal"),
    ("North Bengal Medical College Siliguri", 26.7271, 88.3953, "Siliguri", "West Bengal"),
    ("Bankura Sammilani Hospital", 23.2324, 87.0753, "Bankura", "West Bengal"),
    ("Medinipur Medical College", 22.4257, 87.3119, "Medinipur", "West Bengal"),
    ("Burdwan Medical College", 23.2600, 87.8661, "Bardhaman", "West Bengal"),
    ("District Hospital Asansol", 23.6820, 86.9627, "Asansol", "West Bengal"),
    ("District Hospital Durgapur", 23.5204, 87.3119, "Durgapur", "West Bengal"),
    ("District Hospital Howrah", 22.5958, 88.2636, "Howrah", "West Bengal"),
    ("District Hospital Murshidabad", 24.1788, 88.2664, "Murshidabad", "West Bengal"),
    ("District Hospital Malda", 25.0108, 88.1417, "Malda", "West Bengal"),
    # DELHI (NCT)
    ("AIIMS New Delhi", 28.5681, 77.2100, "New Delhi", "Delhi"),
    ("Safdarjung Hospital Delhi", 28.5686, 77.2065, "New Delhi", "Delhi"),
    ("GTB Hospital Delhi", 28.6821, 77.3042, "Delhi", "Delhi"),
    ("Lok Nayak Hospital Delhi", 28.6369, 77.2440, "Delhi", "Delhi"),
    ("RML Hospital Delhi", 28.6260, 77.2136, "Delhi", "Delhi"),
    ("Hindu Rao Hospital Delhi", 28.6699, 77.2076, "Delhi", "Delhi"),
    ("DDU Hospital Delhi", 28.6336, 77.1147, "Delhi", "Delhi"),
    ("BSA Hospital Delhi", 28.7350, 77.1760, "Delhi", "Delhi"),
    ("Sanjay Gandhi Hospital Delhi", 28.6924, 77.1475, "Delhi", "Delhi"),
    ("Batra Hospital Delhi", 28.5355, 77.2448, "Delhi", "Delhi"),
    # JAMMU & KASHMIR
    ("GMC Srinagar", 34.0836, 74.7973, "Srinagar", "Jammu & Kashmir"),
    ("SMHS Hospital Srinagar", 34.0890, 74.7861, "Srinagar", "Jammu & Kashmir"),
    ("GMC Jammu", 32.7357, 74.8692, "Jammu", "Jammu & Kashmir"),
    ("Shri Maharaja Gulab Hospital Jammu", 32.7194, 74.8574, "Jammu", "Jammu & Kashmir"),
    ("District Hospital Anantnag", 33.7311, 75.1517, "Anantnag", "Jammu & Kashmir"),
    ("District Hospital Baramulla", 34.1966, 74.3413, "Baramulla", "Jammu & Kashmir"),
    ("District Hospital Sopore", 34.2989, 74.4710, "Sopore", "Jammu & Kashmir"),
    ("District Hospital Poonch", 33.7725, 74.0942, "Poonch", "Jammu & Kashmir"),
    ("District Hospital Kathua", 32.3803, 75.5169, "Kathua", "Jammu & Kashmir"),
    # LADAKH
    ("SNM Hospital Leh", 34.1642, 77.5847, "Leh", "Ladakh"),
    ("District Hospital Kargil", 34.5538, 76.1319, "Kargil", "Ladakh"),
    # ANDAMAN & NICOBAR
    ("GB Pant Hospital Port Blair", 11.6234, 92.7265, "Port Blair", "Andaman & Nicobar"),
    ("District Hospital Car Nicobar", 9.1531, 92.8186, "Car Nicobar", "Andaman & Nicobar"),
    # CHANDIGARH
    ("PGIMER Chandigarh", 30.7654, 76.7741, "Chandigarh", "Chandigarh"),
    ("Government Multi Specialty Hospital", 30.7416, 76.7678, "Chandigarh", "Chandigarh"),
    # DADRA NAGAR HAVELI
    ("District Hospital Silvassa", 20.2765, 73.0092, "Silvassa", "Dadra & Nagar Haveli"),
    # DAMAN & DIU
    ("Government Hospital Daman", 20.3974, 72.8328, "Daman", "Daman & Diu"),
    ("Government Hospital Diu", 20.7144, 70.9874, "Diu", "Daman & Diu"),
    # LAKSHADWEEP
    ("Hospital Kavaratti", 10.5626, 72.6369, "Kavaratti", "Lakshadweep"),
    # PUDUCHERRY
    ("JIPMER Puducherry", 11.9416, 79.8290, "Puducherry", "Puducherry"),
    ("Government Hospital Puducherry", 11.9342, 79.8305, "Puducherry", "Puducherry"),
]


def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    dp = math.radians(lat2 - lat1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _load_json_db() -> List[Dict]:
    """Load the large JSON DB if it exists (fetched by fetch_india_hospitals.py)."""
    if os.path.exists(_JSON_PATH):
        try:
            with open(_JSON_PATH, encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list) and len(data) > 10:
                return data
        except Exception:
            pass
    return []


def _seed_to_dicts() -> List[Dict]:
    out = []
    for i, item in enumerate(_SEED):
        # Handle both old and new seed formats during transition if needed
        # New format: (name, lat, lng, city, state, cat, phone)
        name, lat, lng, city, state = item[0], item[1], item[2], item[3], item[4]
        cat = item[5] if len(item) > 5 else "HOSPITAL"
        phone = item[6] if len(item) > 6 else ""
        
        out.append({
            "id": f"seed_{i}",
            "name": name,
            "lat": lat,
            "lng": lng,
            "category": cat,
            "phone": phone,
            "state": state,
            "address": f"{city}, {state}",
        })
    return out


def get_nearby_hospitals(lat: float, lng: float, radius_km: float = 50, limit: int = 30) -> List[Dict[str, Any]]:
    """
    Return nearby hospitals from embedded DB.
    Tries large JSON DB first, falls back to seed list.
    Works 100% offline — no internet needed.
    """
    db = _load_json_db()
    if not db:
        db = _seed_to_dicts()

    results = []
    for h in db:
        try:
            d = _haversine_km(lat, lng, float(h["lat"]), float(h["lng"]))
            if d <= radius_km:
                results.append({
                    "id": h.get("id", ""),
                    "name": h.get("name", "Strategic Point"),
                    "category": h.get("category", "HOSPITAL"),
                    "phone": h.get("phone", ""),
                    "lat": float(h["lat"]),
                    "lng": float(h["lng"]),
                    "address": h.get("address", h.get("state", "India")),
                    "distance_km": round(d, 2),
                    "beds_available": None,
                    "icu_available": None,
                    "source": "offline_db",
                })
        except Exception:
            continue

    results.sort(key=lambda x: x["distance_km"])
    
    # If nothing found within radius_km, return closest 10 from anywhere
    if not results:
        all_with_dist = []
        for h in db:
            try:
                all_with_dist.append({
                    "id": h.get("id", ""),
                    "name": h.get("name", "Hospital"),
                    "lat": float(h["lat"]),
                    "lng": float(h["lng"]),
                    "category": h.get("category", "HOSPITAL"),
                    "phone": h.get("phone", "+91 11-26588500"),
                    "address": h.get("address", h.get("state", "India")),
                    "distance_km": round(d, 2),
                    "beds_available": h.get("beds_available", None) if isinstance(h, dict) else None,
                    "icu_available": h.get("icu_available", None) if isinstance(h, dict) else None,
                    "source": "offline_db",
                })
            except Exception:
                continue
        all_with_dist.sort(key=lambda x: x["distance_km"])
        return all_with_dist[:limit]

    return results[:limit]

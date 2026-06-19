import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_WEBSTORE_API_KEY,
  authDomain: process.env.VITE_WEBSTORE_AUTH_DOMAIN,
  projectId: process.env.VITE_WEBSTORE_PROJECT_ID,
  storageBucket: process.env.VITE_WEBSTORE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_WEBSTORE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_WEBSTORE_APP_ID,
};

console.log('Connecting to Firebase config:', { ...firebaseConfig, apiKey: '***' });

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
  try {
    console.log('Signing in anonymously...');
    const userCredential = await signInAnonymously(auth);
    console.log('Signed in successfully! UID:', userCredential.user.uid);

    console.log('\n--- FETCHING ERP_PRODUCTS COLLECTION (pusat doc) ---');
    const erpDocRef = doc(db, 'erp_products', 'pusat');
    const erpSnap = await getDoc(erpDocRef);
    if (erpSnap.exists()) {
      const data = erpSnap.data();
      console.log('ERP Doc exists. Last updated:', data.lastUpdated);
      console.log(`Number of items in erp_products: ${data.items ? data.items.length : 0}`);
      if (data.items && data.items.length > 0) {
        console.log('Sample item from erp_products:');
        console.log(JSON.stringify(data.items[0], null, 2));
      }
    } else {
      console.log('erp_products/pusat document does not exist!');
    }

    console.log('\n--- FETCHING PRODUCTS COLLECTION (web store catalog) ---');
    const productsColRef = collection(db, 'products');
    const productsSnap = await getDocs(productsColRef);
    console.log(`Number of documents in products: ${productsSnap.size}`);
    productsSnap.forEach((d) => {
      const p = d.data();
      console.log(`- ID: ${d.id}, Name: ${p.name}, Price: ${p.price}, Category: ${p.category}, Image: ${p.imageUrl ? p.imageUrl.substring(0, 60) + '...' : 'NONE'}`);
    });
  } catch (error) {
    console.error('Error fetching from Firestore:', error);
  } finally {
    process.exit(0);
  }
}

main();

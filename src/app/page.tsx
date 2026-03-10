'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  searchProductByBarcode, 
  searchProducts, 
  calculateCustomerProductPrice,
  getCustomerDiscount,
  calculateAllPricesByUnits,
  ProductInfo,
  PriceCalculationResult,
  AllPricesResult 
} from '@/actions/product';
import { formatCurrency } from '@/lib/utils';
import { 
  ScanBarcode, 
  Search, 
  LogOut, 
  Package, 
  Tag, 
  Layers,
  XCircle,
  Loader2,
  Database,
  History,
  ImageIcon,
  Copy,
  Check
} from 'lucide-react';

export default function HomePage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [searchResults, setSearchResults] = useState<ProductInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchHistory, setSearchHistory] = useState<ProductInfo[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);
  const [selectedBarcodeUnit, setSelectedBarcodeUnit] = useState<string>(''); // เก็บหน่วยที่เลือก
  
  // Customer Pricing States - เก็บราคาตามหน่วยที่ต่างกัน
  const [allPrices, setAllPrices] = useState<AllPricesResult | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const barcodeRef = useRef(barcode);

  // Keep barcodeRef in sync
  useEffect(() => {
    barcodeRef.current = barcode;
  }, [barcode]);

  // Focus input on load
  useEffect(() => {
    if (!authLoading && user?.selected_database) {
      inputRef.current?.focus();
    }
  }, [authLoading, user]);

  // Auto search on barcode change (debounce)
  useEffect(() => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = barcode.trim();
    if (!trimmed || !user?.selected_database) return;

    // ถ้าเป็น barcode ตัวเลขยาว 8+ หลัก → รอแค่ 300ms (เครื่องอ่าน)
    // ถ้าเป็น text ปกติ → รอ 600ms
    const isBarcodeLike = /^\d{8,}$/.test(trimmed);
    const delay = isBarcodeLike ? 300 : 600;

    debounceRef.current = setTimeout(() => {
      // ใช้ ref เพื่อให้ได้ค่าล่าสุด
      if (barcodeRef.current.trim()) {
        handleSearchWithValue(barcodeRef.current.trim());
      }
    }, delay);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode, user?.selected_database]);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pricechecker_history');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch {
        localStorage.removeItem('pricechecker_history');
      }
    }
  }, []);

  // Add to history
  const addToHistory = useCallback((item: ProductInfo) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(p => p.code !== item.code);
      const newHistory = [item, ...filtered].slice(0, 10);
      localStorage.setItem('pricechecker_history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  // Load customer pricing for all units
  const loadCustomerPricing = useCallback(async (productData: ProductInfo) => {
    const database = user?.selected_database;
    const customerCode = user?.customer_code || '';
    
    console.log('🔍 loadCustomerPricing called:', {
      code: productData.code,
      barcodes: productData.barcodes?.length || 0,
      database,
      customerCode
    });
    
    if (!database) {
      console.warn('❌ No database selected');
      setAllPrices(null);
      return;
    }

    // ถ้าไม่มี barcodes ก็อย่างไรก็ได้ (default สร้าง in searchProductByBarcode)
    if (!productData.barcodes || productData.barcodes.length === 0) {
      console.warn('⚠️ No barcodes, skipping pricing');
      setAllPrices(null);
      return;
    }

    try {
      setPricingLoading(true);
      
      // ดึงราคาสำหรับ ทุก unit_code
      console.log('📦 Getting prices for all units:', productData.barcodes.map(b => b.unit_code));
      
      const allPricesResult = await calculateAllPricesByUnits(
        database,
        productData.code,
        productData.barcodes,
        customerCode,
        'ภาษีรวมใน'
      );

      console.log('💰 All Prices Result:', allPricesResult);
      setAllPrices(allPricesResult);
    } catch (err) {
      console.error('⚠️ Error loading customer pricing:', err);
      setAllPrices(null);
    } finally {
      setPricingLoading(false);
    }
  }, [user?.customer_code, user?.selected_database]);

  // Load pricing when product changes
  useEffect(() => {
    if (product && user?.selected_database) {
      // รีเซต selected unit ให้เป็นหน่วยแรก
      setSelectedBarcodeUnit(product.barcodes?.[0]?.unit_code || '');
      loadCustomerPricing(product);
    } else {
      setAllPrices(null);
      setSelectedBarcodeUnit('');
    }
  }, [product, user?.selected_database, loadCustomerPricing]);

  // Load pricing again when selected barcode unit changes
  useEffect(() => {
    if (product && selectedBarcodeUnit && user?.selected_database) {
      console.log('🔄 Reloading pricing for unit:', selectedBarcodeUnit);
      loadCustomerPricing(product);
    }
  }, [selectedBarcodeUnit]);

  // Handle barcode scan/search with value parameter
  const handleSearchWithValue = async (searchValue: string) => {
    if (!searchValue || !user?.selected_database) return;
    
    setIsLoading(true);
    setError('');
    setProduct(null);
    setSearchResults([]);
    setShowHistory(false);

    try {
      // First try exact match
      const result = await searchProductByBarcode(user.selected_database, searchValue);
      
      if (result.success && result.data) {
        setProduct(result.data);
        addToHistory(result.data);
        setBarcode('');
      } else {
        // If no exact match, try fuzzy search
        const searchResult = await searchProducts(user.selected_database, searchValue, 10);
        
        if (searchResult.success && searchResult.data.length > 0) {
          setSearchResults(searchResult.data);
        } else {
          setError(result.message || 'ไม่พบสินค้า');
        }
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Wrapper for button/enter key
  const handleSearch = () => {
    if (barcode.trim()) {
      handleSearchWithValue(barcode.trim());
    }
  };

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Select from search results
  const selectProduct = (item: ProductInfo) => {
    setProduct(item);
    setSearchResults([]);
    addToHistory(item);
    setBarcode('');
    inputRef.current?.focus();
  };

  // Select from history
  const selectFromHistory = (item: ProductInfo) => {
    setProduct(item);
    setShowHistory(false);
    setBarcode('');
    inputRef.current?.focus();
  };

  // Clear current product
  const clearProduct = () => {
    setProduct(null);
    setSearchResults([]);
    setError('');
    setBarcode('');
    setSelectedBarcodeUnit(''); // รีเซต selected unit
    inputRef.current?.focus();
  };

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && !user.selected_database) {
      router.push('/select-database');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user?.selected_database) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ScanBarcode className="w-8 h-8" />
            <div>
              <h1 className="font-bold text-lg">Price Checker</h1>
              <p className="text-purple-200 text-xs flex items-center gap-1">
                <Database className="w-3 h-3" />
                {user.selected_database_name}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="ออกจากระบบ"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => !product && searchHistory.length > 0 && setShowHistory(true)}
              placeholder="สแกนบาร์โค้ด หรือ พิมพ์รหัสสินค้า..."
              className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-gray-900 placeholder-gray-400"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {barcode && (
              <button
                onClick={() => setBarcode('')}
                className="absolute inset-y-0 right-16 flex items-center text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={isLoading || !barcode.trim()}
              className="absolute inset-y-0 right-2 my-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* History Dropdown */}
          {showHistory && searchHistory.length > 0 && !product && (
            <div className="mt-2 border-2 border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 flex items-center gap-2 text-sm text-gray-600">
                <History className="w-4 h-4" />
                ประวัติการค้นหา
              </div>
              <div className="max-h-60 overflow-y-auto">
                {searchHistory.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => selectFromHistory(item)}
                    className="w-full px-4 py-3 text-left hover:bg-purple-50 border-b last:border-b-0 transition-colors"
                  >
                    <p className="font-medium text-gray-900">{item.name_1}</p>
                    <p className="text-sm text-gray-500">รหัส: {item.code} | ราคา: {formatCurrency(item.price)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6 animate-fadeIn">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h2 className="font-semibold text-gray-800">ผลการค้นหา ({searchResults.length} รายการ)</h2>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {searchResults.map((item) => (
                <button
                  key={item.code}
                  onClick={() => selectProduct(item)}
                  className="w-full px-6 py-4 text-left hover:bg-purple-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{item.name_1}</p>
                      <p className="text-sm text-gray-500">รหัส: {item.code}</p>
                      {item.barcode && <p className="text-xs text-gray-400">บาร์โค้ด: {item.barcode}</p>}
                    </div>
                    <p className="text-lg font-bold text-purple-600">{formatCurrency(item.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Product Display */}
        {product && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden animate-fadeIn">
            {/* Product Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-purple-200 text-sm">รหัสสินค้า: {product.code}</p>
                  <h2 className="text-xl font-bold mt-1">{product.name_1}</h2>
                  {product.name_2 && <p className="text-purple-200 text-sm">{product.name_2}</p>}
                </div>
                <button
                  onClick={clearProduct}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Product Image & Price */}
            <div className="flex flex-col md:flex-row">
              {/* Product Image */}
              <div className="md:w-1/3 p-4 flex items-center justify-center bg-gray-50">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name_1}
                    className="max-w-full max-h-48 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Main Price */}
              <div className="flex-1 px-6 py-8 bg-gradient-to-br from-purple-50 to-white">
                <p className="text-gray-500 text-sm mb-4 text-center">ราคา</p>
                
                {/* Display Price for Selected Unit */}
                {selectedBarcodeUnit && allPrices?.success && allPrices.prices.length > 0 ? (
                  (() => {
                    const selectedPrice = allPrices.prices.find(p => p.unitCode === selectedBarcodeUnit);
                    if (selectedPrice) {
                      const discountedPrice = selectedPrice.pricing.price - (selectedPrice.pricing.price * selectedPrice.discount / 100);
                      return (
                        <div className="space-y-3">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-600 mb-2">หน่วย: <span className="font-bold text-purple-600">{selectedPrice.unitCode}</span></p>
                            {selectedPrice.discount > 0 && (
                              <p className="text-sm text-red-600 mb-2">
                                ลด {selectedPrice.discount}% <span className="line-through text-gray-400">{formatCurrency(selectedPrice.pricing.price)}</span>
                              </p>
                            )}
                            <p className="text-4xl font-bold text-purple-600">{formatCurrency(discountedPrice)}</p>
                            <p className="text-xs text-gray-500 mt-2">Barcode: {selectedPrice.barcode}</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()
                ) : allPrices?.success && allPrices.prices.length > 0 ? (
                  // Show all prices if no unit selected
                  <div className="space-y-4">
                    {allPrices.prices.map((priceByUnit, idx) => (
                      <div key={idx} className="border rounded-lg p-3 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-left">
                            <p className="text-sm font-medium text-gray-700">หน่วย: {priceByUnit.unitCode}</p>
                            <p className="text-xs text-gray-500">Barcode: {priceByUnit.barcode}</p>
                          </div>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {priceByUnit.pricing.debug?.ruleMatched || 'Tier ' + priceByUnit.pricing.priceType}
                          </span>
                        </div>
                        <div className="text-right pt-2 border-t">
                          {priceByUnit.discount > 0 && (
                            <p className="text-xs text-red-600 mb-1">
                              ลด {priceByUnit.discount}%
                            </p>
                          )}
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(priceByUnit.pricing.price - (priceByUnit.pricing.price * priceByUnit.discount / 100))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-600">{formatCurrency(product.price)}</p>
                    {pricingLoading && (
                      <p className="text-xs text-gray-400 mt-2">กำลังโหลดราคา...</p>
                    )}
                    {allPrices && !allPrices.success && (
                      <p className="text-xs text-red-500 mt-2">{allPrices.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Barcodes - Unit Selection */}
            {product.barcodes && product.barcodes.length > 0 && (
              <div className="px-6 py-4 border-t bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <ScanBarcode className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500 font-semibold">บาร์โค้ด / หน่วยนับ ({product.barcodes.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.barcodes.map((bcInfo) => {
                    const isSelected = selectedBarcodeUnit === bcInfo.unit_code;
                    const priceInfo = allPrices?.prices?.find(p => p.unitCode === bcInfo.unit_code);
                    const unitPrice = priceInfo?.pricing?.price || bcInfo.price;
                    
                    return (
                      <button
                        key={bcInfo.barcode}
                        onClick={() => {
                          setSelectedBarcodeUnit(bcInfo.unit_code);
                          // ทำให้ scroll to price section ถ้าต้องการ
                        }}
                        className={`inline-flex flex-col items-start gap-1 px-3 py-2 rounded-lg text-sm font-mono transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white border-2 border-purple-700 shadow-md'
                            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                        title={`Barcode: ${bcInfo.barcode}\nUnit: ${bcInfo.unit_code}\nPrice: ${unitPrice || 'N/A'}`}
                      >
                        <span className="font-semibold">{bcInfo.unit_code}</span>
                        <span className="text-xs opacity-75">{bcInfo.barcode}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product Details */}
            <div className="px-6 py-4 border-t space-y-3">
              {product.item_brand && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Tag className="w-5 h-5 text-gray-400" />
                  <span>ยี่ห้อ:</span>
                  <span className="font-medium text-gray-900">{product.item_brand}</span>
                </div>
              )}

              {product.item_class && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Layers className="w-5 h-5 text-gray-400" />
                  <span>ประเภท:</span>
                  <span className="font-medium text-gray-900">{product.item_class}</span>
                </div>
              )}

              <div className="flex items-center gap-3 text-gray-600">
                <Package className="w-5 h-5 text-gray-400" />
                <span>คงเหลือ:</span>
                <span className={`font-medium ${product.stock_qty > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {product.stock_qty.toLocaleString()} {product.unit_name}
                </span>
              </div>
            </div>

            {/* Other Prices */}
            {(product.price_2 > 0 || product.price_3 > 0 || product.price_4 > 0) && (
              <div className="px-6 py-4 border-t bg-gray-50">
                <p className="text-sm text-gray-500 mb-3">ราคาอื่นๆ</p>
                <div className="grid grid-cols-2 gap-3">
                  {product.price_2 > 0 && (
                    <div className="bg-white rounded-lg p-3 border">
                      <p className="text-xs text-gray-500">ราคา 2</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(product.price_2)}</p>
                    </div>
                  )}
                  {product.price_3 > 0 && (
                    <div className="bg-white rounded-lg p-3 border">
                      <p className="text-xs text-gray-500">ราคา 3</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(product.price_3)}</p>
                    </div>
                  )}
                  {product.price_4 > 0 && (
                    <div className="bg-white rounded-lg p-3 border">
                      <p className="text-xs text-gray-500">ราคา 4</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(product.price_4)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!product && !error && searchResults.length === 0 && !showHistory && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <ScanBarcode className="w-12 h-12 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">พร้อมสแกน</h2>
            <p className="text-gray-500">สแกนบาร์โค้ดหรือพิมพ์รหัสสินค้าเพื่อเช็คราคา</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-gray-400 text-sm">
        © 2026 NextStep Software & Hardware
      </footer>
    </div>
  );
}

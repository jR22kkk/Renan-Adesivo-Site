import { useState, useEffect, useMemo, createContext, useContext, ChangeEvent } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, LayoutDashboard, LogIn, Search, Filter, Phone, Mail, Instagram, ChevronRight, Plus, Trash2, Edit, Save, X, Image as ImageIcon, User as UserIcon, ShieldCheck, Minus, Send, CreditCard, Banknote, Star, Smartphone } from 'lucide-react';
import NewLogo from './assets/images/regenerated_image_1778854471184.png';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut, signInWithPopup, googleProvider } from './lib/firebase';
import { collection, query, getDocs, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { cn } from './lib/utils';
import { Product, Category, OperationType, FirestoreErrorInfo, CartItem, PaymentMethod, Order, HeroConfig, ProductVariant } from './types.ts';

// --- Context ---

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, variant?: ProductVariant) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  total: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  viewProduct: Product | null;
  setViewProduct: (product: Product | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}

// --- Helpers ---

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // In development, you might want to show this to the user for debugging
  // alert(`Erro de Permissão: Verifique se você está logado com a conta correta.`);
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const Logo = ({ className }: { className?: string }) => (
  <img 
    src={NewLogo} 
    className={cn("w-full h-full object-contain", className)} 
    alt="Renan Adesivos Logo" 
  />
);

function Header({ user }: { user: any }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, setIsOpen, searchTerm, setSearchTerm, setViewProduct } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
  }, []);

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowResults(true);
  };

  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [searchTerm, products]);

  const selectProduct = (product: Product) => {
    setViewProduct(product);
    setSearchTerm('');
    setShowResults(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-zinc-200 transition-colors">
      <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between gap-8">
        <Link to="/" className="flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-lg">
            <Logo />
          </div>
          <h1 className="font-display font-black text-2xl tracking-tighter uppercase hidden sm:block">
            Renan <span className="text-brand">Adesivos</span>
          </h1>
        </Link>

        <div className="flex-1 max-w-sm md:max-w-md relative">
          <div className="relative w-full z-30">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar adesivos..."
              value={searchTerm}
              onChange={handleSearch}
              onFocus={() => setShowResults(true)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-100 border-none rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-brand outline-none transition-all"
            />
          </div>

          <AnimatePresence>
            {showResults && searchTerm && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowResults(false)}
                />
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-zinc-100 overflow-hidden z-20 w-[95vw] md:w-full -mx-[calc((95vw-100%)/2)] md:mx-0"
                >
                  {filteredResults.length > 0 ? (
                    <div className="py-2">
                      <div className="px-4 py-2 text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-50">
                        Resultados encontrados
                      </div>
                      {filteredResults.map(product => (
                        <button
                          key={product.id}
                          onClick={() => selectProduct(product)}
                          className="w-full px-4 py-2 md:py-3 flex items-center gap-3 md:gap-4 hover:bg-zinc-50 transition-colors text-left"
                        >
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-zinc-100 overflow-hidden shrink-0 border border-zinc-200">
                            {product.images?.[0] && (
                              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs md:text-sm font-bold text-zinc-900 truncate">{product.name}</h4>
                            <p className="text-[10px] md:text-xs text-zinc-500 font-medium">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                            </p>
                          </div>
                          <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-zinc-300" />
                        </button>
                      ))}
                      <Link 
                        to="/produtos" 
                        onClick={() => setShowResults(false)}
                        className="block w-full p-2.5 md:p-3 text-center text-[10px] md:text-xs font-black uppercase text-brand hover:bg-brand/5 transition-colors border-t border-zinc-50"
                      >
                        Ver todos os produtos
                      </Link>
                    </div>
                  ) : (
                    <div className="p-6 md:p-8 text-center font-bold text-zinc-400 text-xs md:text-sm italic">
                      Nenhum adesivo encontrado
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <nav className="hidden lg:flex items-center gap-8 font-semibold text-sm text-zinc-600">
          <Link to="/" className={cn("hover:text-brand transition-colors", location.pathname === '/' && "text-brand")}>INÍCIO</Link>
          <Link to="/produtos" className={cn("hover:text-brand transition-colors", location.pathname === '/produtos' && "text-brand")}>CATÁLOGO</Link>
          <Link to="/perfil" className={cn("hover:text-brand transition-colors", location.pathname === '/perfil' && "text-brand")}>USUÁRIO</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/perfil" className="flex items-center gap-2 text-sm font-semibold hover:text-brand transition-colors">
            <UserIcon size={20} />
            <span className="hidden sm:inline">{user ? 'Perfil' : 'Entrar'}</span>
          </Link>
          <button 
            onClick={() => setIsOpen(true)}
            className="bg-zinc-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
          >
            <ShoppingBag size={18} />
            <span className="hidden sm:inline">Carrinho ({cartCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function ProductCard({ product }: { product: Product, key?: any }) {
  const { addToCart, setViewProduct } = useCart();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5 }}
      onClick={() => setViewProduct(product)}
      className="bg-white rounded-xl md:rounded-2xl border border-zinc-200 p-3 md:p-4 shadow-sm group hover:shadow-xl hover:border-brand/30 transition-all cursor-pointer h-full flex flex-col"
    >
      <div className="aspect-square bg-zinc-100 rounded-lg md:rounded-xl mb-2 md:mb-4 relative overflow-hidden">
        {product.images?.[0] ? (
          <img 
            src={product.images[0]} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400">
            <ImageIcon size={40} />
          </div>
        )}
        {product.featured && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest leading-none">
            Destaque
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1">
        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-brand mb-0.5 md:mb-1">{product.category}</p>
        <h3 className="font-display font-bold text-zinc-800 text-sm md:text-lg leading-tight mb-1 line-clamp-2 min-h-[2.5rem] md:min-h-[3.5rem]">{product.name}</h3>
        <div className="flex items-center justify-between mt-auto pt-2 md:pt-3">
          <div className="flex flex-col">
            {product.variants && product.variants.length > 0 ? (
              <>
                <span className="text-[8px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-0.5 md:mb-1">A partir de</span>
                <span className="text-base md:text-xl font-black text-zinc-900">
                  R$ {Math.min(...product.variants.map(v => v.price)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </>
            ) : (
              <span className="text-base md:text-xl font-black text-zinc-900">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            )}
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (product.variants && product.variants.length > 0) {
                setViewProduct(product);
              } else {
                addToCart(product);
              }
            }}
            className="p-1.5 md:p-2 rounded-full bg-zinc-100 text-zinc-900 hover:bg-brand hover:text-white transition-all shadow-sm"
          >
            <Plus size={16} className="md:w-[18px] md:h-[18px]" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ProductViewModal() {
  const { viewProduct, setViewProduct, addToCart } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(undefined);

  useEffect(() => {
    setActiveImage(0);
    setSelectedVariant(viewProduct?.variants?.[0]);
  }, [viewProduct]);

  useEffect(() => {
    if (selectedVariant?.image) {
      const variantImgIndex = viewProduct?.images?.indexOf(selectedVariant.image);
      if (variantImgIndex !== undefined && variantImgIndex !== -1) {
        setActiveImage(variantImgIndex);
      }
    }
  }, [selectedVariant, viewProduct]);

  if (!viewProduct) return null;

  const currentPrice = selectedVariant ? selectedVariant.price : viewProduct.price;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setViewProduct(null)}
          className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 flex flex-col md:flex-row border border-zinc-100 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => setViewProduct(null)}
            className="absolute top-6 right-6 z-30 p-3 bg-white/50 hover:bg-white text-zinc-900 rounded-full transition-all shadow-lg backdrop-blur-sm"
          >
            <X size={20} />
          </button>

          {/* Left: Gallery Section */}
          <div className="w-full md:w-[55%] flex flex-col bg-zinc-50 border-r border-zinc-100">
            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-zinc-100/50 p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeImage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  {selectedVariant?.image || viewProduct.images?.[activeImage] ? (
                    <img 
                      src={selectedVariant?.image || viewProduct.images[activeImage]} 
                      className="max-w-full max-h-full object-contain drop-shadow-2xl" 
                      alt={viewProduct.name}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-zinc-300">
                      <ImageIcon size={80} strokeWidth={1} />
                      <span className="text-xs font-black uppercase tracking-widest mt-2">Sem Imagem</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Thumbnails */}
            {viewProduct.images && viewProduct.images.length > 1 && (
              <div className="p-6 flex justify-center gap-3 bg-white/50 backdrop-blur-xs border-t border-zinc-100">
                {viewProduct.images.map((img, i) => (
                  <button 
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      "w-16 h-16 rounded-xl overflow-hidden border-2 transition-all p-0.5",
                      activeImage === i ? "border-brand shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={img} className="w-full h-full object-cover rounded-lg" alt="" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info Section */}
          <div className="flex-1 p-10 md:p-12 overflow-y-auto flex flex-col bg-white">
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-black text-brand bg-brand/10 px-3 py-1 rounded-full uppercase tracking-widest">
                  {viewProduct.category}
                </span>
                {viewProduct.featured && (
                  <span className="text-[10px] font-black text-red-600 bg-red-100 px-3 py-1 rounded-full uppercase tracking-widest">
                    Destaque
                  </span>
                )}
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tighter text-zinc-900 leading-[0.9] mb-4">
                {viewProduct.name}
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-zinc-400">R$</span>
                <span className="text-4xl font-black text-zinc-900 tracking-tighter">
                  {currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-8 flex-1">
              {viewProduct.variants && viewProduct.variants.length > 0 && (
                <div className="pt-8 border-t border-zinc-100">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Filter size={12} className="text-brand" />
                    Opções Disponíveis
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {viewProduct.variants.map((v, i) => (
                      <button 
                        key={i}
                        onClick={() => setSelectedVariant(v)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                          selectedVariant?.name === v.name 
                            ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" 
                            : "bg-white text-zinc-600 border-zinc-100 hover:border-brand/30 hover:text-brand"
                        )}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-zinc-100">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Star size={12} className="text-brand" />
                  Descrição da Peça
                </h4>
                <div className="text-zinc-600 leading-relaxed font-medium text-sm whitespace-pre-wrap">
                  {viewProduct.description || "Este item premium foi selecionado para garantir o melhor desempenho e durabilidade para sua moto."}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col gap-1">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">Qualidade</span>
                  <span className="text-xs font-bold text-zinc-800 uppercase">Testado & Aprovado</span>
                </div>
                <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col gap-1">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">Entrega</span>
                  <span className="text-xs font-bold text-zinc-800 uppercase">Imediata (Recife)</span>
                </div>
              </div>
            </div>

            <div className="pt-10 mt-auto flex flex-col gap-4">
              <button 
                onClick={() => {
                  addToCart(viewProduct, selectedVariant);
                  setViewProduct(null);
                }}
                className="w-full py-5 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95"
              >
                <Plus size={18} />
                Adicionar ao Carrinho
              </button>
              <button 
                onClick={() => setViewProduct(null)}
                className="w-full py-2 text-zinc-400 font-bold uppercase tracking-widest text-[9px] hover:text-zinc-900 transition-colors"
              >
                Cancelar e Voltar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function FloatingWhatsApp() {
  const message = encodeURIComponent("🚀 Tire suas dúvidas e faça seu pedido pelo WhatsApp!");
  return (
    <a 
      href={`https://wa.me/5581986063791?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-8 right-8 z-[60] bg-[#25D366] text-white p-4 rounded-full shadow-2xl shadow-green-500/30 hover:scale-110 transition-transform flex items-center justify-center group"
    >
      <Phone size={32} />
      <span className="absolute right-full mr-4 bg-white text-zinc-900 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-zinc-100">
        Suporte no WhatsApp
      </span>
    </a>
  );
}

function CartDrawer() {
  const { cart, isOpen, setIsOpen, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [isProcessing, setIsProcessing] = useState(false);
  const [address, setAddress] = useState({
    street: '',
    number: '',
    neighborhood: '',
    zipCode: ''
  });
  
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!auth.currentUser) {
      alert('Você precisa estar logado para finalizar o pedido.');
      setIsOpen(false);
      return;
    }

    if (!address.street || !address.number || !address.neighborhood || !address.zipCode) {
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    try {
      // Save order to Firestore
      const orderData: Partial<Order> = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email || '',
        items: cart,
        total,
        paymentMethod,
        status: 'PENDENTE',
        address,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      const itemsList = cart.map(item => {
        const price = item.selectedVariant ? item.selectedVariant.price : item.product.price;
        const nameText = item.selectedVariant ? `${item.product.name} (${item.selectedVariant.name})` : item.product.name;
        return `✅ *${nameText.toUpperCase()}*\n` +
               `📦 Quantidade: ${item.quantity}x\n` +
               `💰 Valor: *R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*`;
      }).join('\n\n');
      
      const paymentText = paymentMethod === 'PIX' ? 'PIX' : paymentMethod === 'CARTAO' ? 'Cartão de Crédito/Débito' : 'Dinheiro';
      
      const message = `🔥 *NOVO PEDIDO - RENAN ADESIVOS*\n\n` +
        `🛍️ *ITENS:*\n\n${itemsList}\n\n` +
        `💵 *TOTAL:* *R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n` +
        `💳 *FORMA DE PAGAMENTO:* ${paymentText}\n\n` +
        `📍 *ENDEREÇO DE ENTREGA:*\n` +
        `🏠 Rua ${address.street}, ${address.number}\n` +
        `🏘️ Bairro: ${address.neighborhood}\n` +
        `📮 CEP: ${address.zipCode}\n\n` +
        `✅ Gostaria de finalizar minha compra!`;
        
      window.open(`https://wa.me/5581986063791?text=${encodeURIComponent(message)}`, '_blank');
      
      clearCart();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'orders');
    } finally {
      setIsProcessing(false);
      setIsOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm md:max-w-md bg-white z-[101] shadow-2xl flex flex-col transition-colors border-l border-zinc-100"
          >
            <div className="p-6 md:p-8 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <ShoppingBag className="text-brand w-5 h-5 md:w-6 md:h-6" />
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter">Seu Carrinho</h2>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 md:space-y-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-4">
                  <ShoppingBag size={48} className="md:w-16 md:h-16" />
                  <p className="font-display font-bold text-lg md:text-xl uppercase tracking-tighter">O carrinho está vazio</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-3 md:gap-4 group">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200 shrink-0">
                      <img src={item.product.images?.[0]} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 space-y-1.5 md:space-y-2 min-w-0">
                      <h4 className="font-bold text-zinc-900 leading-tight text-xs md:text-sm line-clamp-1">{item.product.name}</h4>
                      {item.selectedVariant && (
                        <p className="text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Opção: {item.selectedVariant.name}</p>
                      )}
                      <p className="text-brand font-black text-[10px] md:text-xs uppercase tracking-widest">R$ {(item.selectedVariant ? item.selectedVariant.price : item.product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="flex items-center bg-zinc-100 rounded-lg p-0.5 md:p-1">
                          <button 
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:bg-white rounded transition-all text-zinc-400 hover:text-zinc-900"
                          >
                            <Minus size={12} className="md:w-3.5 md:h-3.5" />
                          </button>
                          <span className="w-6 md:w-8 text-center text-[10px] md:text-xs font-black">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 hover:bg-white rounded transition-all text-zinc-400 hover:text-zinc-900"
                          >
                            <Plus size={12} className="md:w-3.5 md:h-3.5" />
                          </button>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 md:p-8 bg-zinc-50 border-t border-zinc-100 space-y-6 md:space-y-8 transition-colors">
                <div className="space-y-3 md:space-y-4">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Meio de Pagamento</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'PIX', label: 'PIX', icon: ShieldCheck },
                      { id: 'CARTAO', label: 'Cartão', icon: CreditCard },
                      { id: 'DINHEIRO', label: 'Dinheiro', icon: Banknote },
                    ].map(method => (
                      <button 
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 md:p-3 rounded-xl border transition-all gap-1.5 md:gap-2",
                          paymentMethod === method.id 
                            ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" 
                            : "bg-white text-zinc-400 border-zinc-200 hover:border-brand/30 hover:text-brand"
                        )}
                      >
                        <method.icon size={16} className="md:w-[18px] md:h-[18px]" />
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Endereço de Entrega</h4>
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <div className="col-span-2">
                       <input 
                        type="text" 
                        placeholder="Rua / Logradouro"
                        value={address.street}
                        onChange={(e) => setAddress({ ...address, street: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[10px] md:text-xs outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Número"
                      value={address.number}
                      onChange={(e) => setAddress({ ...address, number: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[10px] md:text-xs outline-none focus:ring-1 focus:ring-brand"
                    />
                    <input 
                      type="text" 
                      placeholder="CEP"
                      value={address.zipCode}
                      onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[10px] md:text-xs outline-none focus:ring-1 focus:ring-brand"
                    />
                    <div className="col-span-2">
                      <input 
                        type="text" 
                        placeholder="Bairro"
                        value={address.neighborhood}
                        onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[10px] md:text-xs outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between font-display">
                  <span className="text-zinc-400 font-bold text-xs md:text-sm uppercase tracking-widest">Total</span>
                  <span className="text-xl md:text-3xl font-black text-zinc-900 tracking-tighter">
                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <button 
                  onClick={handleCheckout}
                  disabled={isProcessing || cart.length === 0 || !address.street || !address.number || !address.neighborhood || !address.zipCode}
                  className={cn(
                    "w-full py-4 md:py-5 rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm transition-all shadow-xl flex items-center justify-center gap-2 md:gap-3 active:scale-95",
                    (!address.street || !address.number || !address.neighborhood || !address.zipCode)
                      ? "bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none"
                      : "bg-[#25D366] text-white hover:bg-[#20ba5a] shadow-green-500/20"
                  )}
                >
                  {isProcessing ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Smartphone size={18} />
                    </motion.div>
                  ) : (
                    <Send size={18} />
                  )}
                  {isProcessing ? 'Processando...' : 'Finalizar no WhatsApp'}
                </button>
                {(!address.street || !address.number || !address.neighborhood || !address.zipCode) && cart.length > 0 && (
                  <p className="text-[9px] text-center text-red-400 font-bold uppercase tracking-widest animate-pulse">
                    Preencha o endereço para finalizar
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// --- Pages ---

function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const { searchTerm } = useCart();
  const [heroConfig, setHeroConfig] = useState<HeroConfig>({
    title: 'Renovando sua Paixão',
    subtitle: 'Adesivos automotivos de alta performance com design exclusivo e durabilidade incomparável.',
    imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=2071'
  });

  useEffect(() => {
    const unsubHero = onSnapshot(doc(db, 'config', 'hero'), (snap) => {
      if (snap.exists()) setHeroConfig(snap.data() as HeroConfig);
    });

    const qCats = query(collection(db, 'categories'));
    getDocs(qCats).then(snap => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category))))
      .catch(err => handleFirestoreError(err, OperationType.LIST, 'categories'));

    const qProds = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(qProds, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });
    return () => unsubscribe();
  }, []);

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        const matchesCat = activeCategory === 'all' || p.category === activeCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCat && matchesSearch;
      })
      .slice(0, 6);
  }, [products, activeCategory, searchTerm]);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden bg-zinc-900">
        <div className="absolute inset-0 opacity-30">
          <img 
            src={heroConfig.imageUrl} 
            alt="Hero" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 bg-brand text-white rounded-lg text-xs font-bold uppercase tracking-widest mb-6">
              Personalização de Qualidade
            </span>
            <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase leading-[0.9]">
              {heroConfig.title.split(' ').map((word, i) => (
                <span key={i} className={cn(i === heroConfig.title.split(' ').length - 1 ? "text-brand" : "")}>
                  {word}{' '}
                </span>
              ))}
            </h1>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-300 text-xl md:text-2xl font-light max-w-2xl mx-auto"
          >
            {heroConfig.subtitle}
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link to="/produtos" className="px-8 py-4 bg-brand text-white rounded-lg font-black uppercase tracking-wider text-sm hover:bg-brand-dark transition-all transform hover:-translate-y-1 shadow-xl shadow-brand/20">
              Ver Catálogo
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Products & Catalogs Section */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 lg:p-16 border border-zinc-100 shadow-2xl shadow-zinc-200/50 transition-colors">
          <div className="flex flex-col-reverse lg:flex-row gap-12 lg:gap-16">
            {/* Left Column: Catalogs Selection */}
            <div className="lg:w-1/4">
              <div className="mb-12">
                <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-brand mb-4">Escolha a peça que é a cara da sua moto</span>
                <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter text-zinc-900 leading-[0.85] mb-6">
                  PEÇAS<br/>ACESSORIOS
                </h2>
                <p className="text-zinc-500 font-medium text-sm leading-relaxed mb-10">
                  Explore centenas de designs exclusivos divididos por aplicação. Qualidade que cola.
                </p>
                
                <div className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
                  <button 
                    onClick={() => setActiveCategory('all')}
                    className={cn(
                      "flex-shrink-0 lg:w-full text-left p-3 md:p-4 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest transition-all border",
                      activeCategory === 'all' 
                        ? "bg-brand text-white border-brand shadow-xl shadow-brand/20" 
                        : "bg-white text-zinc-400 border-zinc-100 hover:border-brand/30 hover:text-brand"
                    )}
                  >
                    Todos os Produtos
                  </button>
                  {categories.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.name)}
                      className={cn(
                        "flex-shrink-0 lg:w-full text-left p-3 md:p-4 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest transition-all border",
                        activeCategory === cat.name 
                          ? "bg-brand text-white border-brand shadow-xl shadow-brand/20" 
                          : "bg-white text-zinc-400 border-zinc-100 hover:border-brand/30 hover:text-brand"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-zinc-950 rounded-3xl text-white relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand/20 rounded-full blur-3xl group-hover:bg-brand/40 transition-all"></div>
                <h4 className="font-display font-black text-xl mb-4 relative z-10 uppercase tracking-tighter">Quer mudar a Cor da Sua moto?</h4>
                <p className="text-[10px] text-zinc-400 mb-6 relative z-10 leading-relaxed uppercase font-bold tracking-widest">Trabalhamos também com adesivos, entre em contato e saiba mais.</p>
                <button 
                  onClick={() => window.open(`https://wa.me/5581986063791?text=${encodeURIComponent("Olá, gostaria de saber mais sobre o envelopamento da minha moto.")}`, '_blank')}
                  className="w-full py-3 bg-white text-zinc-900 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all relative z-10 shadow-lg"
                >
                  Falar no Whats
                </button>
              </div>
            </div>

            {/* Right Column: Products Grid */}
            <div className="lg:w-3/4">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-100">
                <h3 className="text-zinc-400 font-black uppercase text-[10px] tracking-widest">Principais Ofertas</h3>
                <Link to="/produtos" className="text-brand font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:translate-x-1 transition-transform">
                  Catálogo Completo <ChevronRight size={14} />
                </Link>
              </div>

              <AnimatePresence mode="popLayout">
                <motion.div 
                  layout
                  className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6"
                >
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </motion.div>
              </AnimatePresence>

              {filteredProducts.length === 0 && (
                <div className="py-24 text-center border-2 border-dashed border-zinc-100 rounded-[2rem] bg-zinc-50/50">
                  <Search size={48} className="mx-auto text-zinc-200 mb-4" />
                  <p className="font-display font-black text-2xl text-zinc-300 uppercase tracking-tighter">Nenhum Item Encontrado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="bg-zinc-100 py-24">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { title: "Alta Durabilidade", desc: "Peças e acessórios de qualidade, resistentes e feitos para garantir segurança e longa vida útil.", icon: ShoppingBag },
            { title: "Personalização", desc: "Produtos exclusivos para deixar sua moto com mais estilo, conforto e identidade.", icon: Edit },
            { title: "Entrega Rápida", desc: "Produção e envio ágil para toda região do Recife", icon: ChevronRight },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-brand shadow-sm">
                <item.icon size={32} />
              </div>
              <h3 className="font-display font-bold text-2xl text-zinc-900">{item.title}</h3>
              <p className="text-zinc-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const { searchTerm } = useCart();

  useEffect(() => {
    const qCats = query(collection(db, 'categories'));
    getDocs(qCats).then(snap => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category))))
      .catch(err => handleFirestoreError(err, OperationType.LIST, 'categories'));

    const qProds = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(qProds, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });
    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesCat = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col-reverse lg:flex-row min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-full lg:w-72 bg-white border-r border-zinc-200 p-8 flex-col gap-8 flex-shrink-0 transition-colors">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6">Categorias</h3>
          <ul className="space-y-1">
            <li>
              <button 
                onClick={() => setActiveCategory('all')}
                className={cn(
                  "w-full flex items-center justify-between text-sm font-bold p-3 rounded-lg transition-all",
                  activeCategory === 'all' ? "bg-brand/10 text-brand" : "text-zinc-600 hover:bg-zinc-50"
                )}
              >
                <span>Todo Catálogo</span>
                <span className="text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-400">{products.length}</span>
              </button>
            </li>
            {categories.map(cat => (
              <li key={cat.id}>
                <button 
                  onClick={() => setActiveCategory(cat.name)}
                  className={cn(
                    "w-full flex items-center justify-between text-sm font-bold p-3 rounded-lg transition-all",
                    activeCategory === cat.name ? "bg-brand/10 text-brand" : "text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  <span>{cat.name}</span>
                  <span className="text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-400">
                    {products.filter(p => p.category === cat.name).length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto bg-zinc-900 rounded-2xl p-6 text-white overflow-hidden relative group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-brand/20 rounded-full blur-2xl group-hover:bg-brand/40 transition-all"></div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">Suporte Direto</p>
          <h4 className="font-display font-bold text-lg mb-4 leading-tight">Dúvidas sobre personalização?</h4>
          <button className="w-full py-2.5 bg-brand rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-brand-dark transition-all">Chamar no Whats</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 lg:p-12 bg-[#f9fafb] transition-colors">
        <div className="flex flex-col md:flex-row gap-8 items-end justify-between mb-12">
          <div>
            <h2 className="text-4xl font-bold text-zinc-900 mb-2 font-display uppercase tracking-tighter">Produtos</h2>
            <p className="text-zinc-500 text-sm">Exibindo {filteredProducts.length} itens encontrados</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <select className="bg-white border border-zinc-200 text-sm px-4 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-brand font-semibold">
              <option>Mais recentes</option>
              <option>Preço: Menor para Maior</option>
              <option>Preço: Maior para Menor</option>
            </select>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          <motion.div 
            layout
            className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-6"
          >
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </motion.div>
        </AnimatePresence>

        {filteredProducts.length === 0 && (
          <div className="py-40 text-center opacity-30">
            <Search size={48} className="mx-auto mb-4" />
            <p className="text-2xl font-display font-bold">Nenhum adesivo encontrado.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function ProfilePage({ user }: { user: any }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'admins'), where('__name__', '==', user.uid));
      getDocs(q).then(snap => setIsAdmin(!snap.empty));

      const qOrders = query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      const unsubOrders = onSnapshot(qOrders, (snap) => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      });
      return () => unsubOrders();
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth).then(() => navigate('/'));

  const bootstrap = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'admins', user.uid), { email: user.email });
      const cats = ['Automotivo', 'Decorativo', 'Empresarial', 'Personalizado'];
      for (const name of cats) {
        await addDoc(collection(db, 'categories'), { name, slug: name.toLowerCase() });
      }
      alert('Sistema vinculado como Administrador!');
      window.location.reload();
    } catch (err) {
       handleFirestoreError(err, OperationType.WRITE, 'admins');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-20 min-h-screen">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden transition-colors">
        <div className="bg-zinc-900 p-12 text-center text-white space-y-6 relative">
          <div className="w-24 h-24 bg-brand rounded-full mx-auto flex items-center justify-center text-4xl font-black">
            {user?.displayName?.[0] || 'U'}
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">{user ? user.displayName : 'Acesso Restrito'}</h2>
            <p className="text-zinc-400 font-medium">{user ? user.email : 'Faça login para gerenciar sua conta'}</p>
          </div>
        </div>
        
        <div className="p-12 space-y-8">
          {!user ? (
            <div className="text-center space-y-6">
              <p className="text-zinc-500 font-medium">Conecte sua conta Google para acessar recursos exclusivos e o painel de controle.</p>
              <button 
                onClick={handleLogin}
                className="w-full py-4 bg-brand text-white rounded-xl font-black uppercase tracking-widest hover:bg-brand-dark transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand/20"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5 rounded-full brightness-110" alt="G" />
                Continuar com Google
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isAdmin && (
                  <Link 
                    to="/admin"
                    className="flex flex-col items-center justify-center p-8 bg-brand/5 border border-brand/20 rounded-2xl group hover:bg-brand hover:text-white transition-all text-brand"
                  >
                    <LayoutDashboard size={32} className="mb-4" />
                    <span className="font-black uppercase tracking-widest text-xs">Painel Catálogo</span>
                  </Link>
                )}
                <button 
                  onClick={handleLogout}
                  className="flex flex-col items-center justify-center p-8 bg-zinc-50 border border-zinc-200 rounded-2xl group hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all text-zinc-500"
                >
                  <LogIn size={32} className="mb-4" />
                  <span className="font-black uppercase tracking-widest text-xs">Sair da Conta</span>
                </button>
              </div>

              {/* Order History */}
              <div className="pt-12 space-y-6">
                <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <ShoppingBag size={24} className="text-brand" />
                  Histórico de Pedidos
                </h3>
                
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-zinc-100 rounded-2xl bg-zinc-50/30">
                      <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Nenhum pedido realizado ainda.</p>
                    </div>
                  ) : (
                    orders.map(order => (
                      <div key={order.id} className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            {order.createdAt?.toDate().toLocaleString('pt-BR')}
                          </span>
                          <span className="px-2 py-1 bg-brand text-white text-[9px] font-black uppercase tracking-widest rounded">
                            {order.paymentMethod}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="font-medium text-zinc-600">
                                {item.quantity}x {item.product.name}
                                {item.selectedVariant && <span className="text-[10px] text-zinc-400 block">({item.selectedVariant.name})</span>}
                              </span>
                              <span className="font-bold text-zinc-900">R$ {((item.selectedVariant ? item.selectedVariant.price : item.product.price) * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-4 border-t border-zinc-200 flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Total</span>
                          <span className="text-lg font-black text-zinc-900">R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {!isAdmin && user.email === 'cpd00426@gmail.com' && (
                <div className="pt-8 border-t border-zinc-100 mt-8 text-center bg-brand/5 p-8 rounded-2xl border border-brand/10">
                  <ShieldCheck className="text-brand mx-auto mb-4" size={40} />
                  <h4 className="font-display font-black text-xl mb-2 uppercase tracking-tighter">Vínculo Administrativo</h4>
                  <p className="text-zinc-600 text-sm mb-6">Sua conta foi identificada como proprietária. Ative as permissões para gerenciar adesivos e categorias.</p>
                  <button 
                    onClick={bootstrap}
                    className="px-8 py-3 bg-brand text-white rounded-lg font-black uppercase tracking-widest text-xs hover:bg-brand-dark transition-all shadow-lg shadow-brand/20"
                  >
                    Ativar Painel de Controle
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [imgUrlInput, setImgUrlInput] = useState('');
  const [heroConfig, setHeroConfig] = useState<HeroConfig>({ title: '', subtitle: '', imageUrl: '' });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [tempCategoryName, setTempCategoryName] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'orders' | 'config'>('catalog');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const adminSnap = await getDocs(query(collection(db, 'admins'), where('__name__', '==', user.uid)));
        setIsAdmin(!adminSnap.empty);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleLogout = () => signOut(auth).then(() => navigate('/'));

  useEffect(() => {
    if (isAdmin) {
      const qProds = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const qCats = query(collection(db, 'categories'));
      const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      
      const unsubProds = onSnapshot(qProds, (snap) => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))), (err) => handleFirestoreError(err, OperationType.LIST, 'products'));
      const unsubCats = onSnapshot(qCats, (snap) => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category))), (err) => handleFirestoreError(err, OperationType.LIST, 'categories'));
      const unsubOrders = onSnapshot(qOrders, (snap) => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))), (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));
      const unsubHero = onSnapshot(doc(db, 'config', 'hero'), (snap) => {
        if (snap.exists()) setHeroConfig(snap.data() as HeroConfig);
      });
      
      return () => { unsubProds(); unsubCats(); unsubOrders(); unsubHero(); };
    }
  }, [isAdmin]);

  const saveHeroConfig = async () => {
    try {
      await setDoc(doc(db, 'config', 'hero'), heroConfig);
      alert('Configuração de destaque atualizada com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/hero');
    }
  };

  const saveProduct = async () => {
    if (!editingProduct) return;
    const { id, ...data } = editingProduct;
    try {
      if (id) {
        await updateDoc(doc(db, 'products', id), { ...data, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'products'), { 
          ...data, 
          images: data.images || [],
          featured: data.featured || false,
          createdAt: serverTimestamp(), 
          updatedAt: serverTimestamp() 
        });
      }
      setEditingProduct(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCategoryName.trim(),
        slug: newCategoryName.trim().toLowerCase().replace(/\s+/g, '-')
      });
      setNewCategoryName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'categories');
    }
  };

  const updateCategory = async (id: string, oldName: string) => {
    const newName = tempCategoryName.trim();
    if (!newName || newName === oldName) {
      setEditingCategoryId(null);
      return;
    }
    try {
      await updateDoc(doc(db, 'categories', id), {
        name: newName,
        slug: newName.toLowerCase().replace(/\s+/g, '-')
      });
      
      // Update all products that belong to the old category name
      const affectedProducts = products.filter(p => p.category === oldName);
      await Promise.all(affectedProducts.map(p => 
        updateDoc(doc(db, 'products', p.id), { category: newName })
      ));

      setEditingCategoryId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'categories');
    }
  };

  const deleteCategory = async (id: string, name: string) => {
    const hasProducts = products.some(p => p.category === name);
    if (hasProducts) {
      alert('Não é possível excluir uma categoria que possui produtos vinculados.');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir a categoria "${name}"?`)) {
      await deleteDoc(doc(db, 'categories', id));
    }
  };

  if (isAdmin === null) return <div className="min-h-screen flex items-center justify-center font-display uppercase font-black text-zinc-300">Carregando...</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border border-zinc-200 text-center space-y-8">
          <div className="w-20 h-20 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto">
            <LayoutDashboard size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-zinc-900 tracking-tighter uppercase">Painel Restrito</h1>
            <p className="text-zinc-500 font-medium">Você precisa de permissões administrativas.</p>
          </div>
          <Link 
            to="/perfil"
            className="w-full py-4 bg-zinc-900 text-white rounded-lg font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-zinc-200 uppercase text-xs tracking-widest text-center"
          >
            Voltar para Perfil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-zinc-900 tracking-tighter uppercase mb-2">Gestão de Catálogo</h2>
          <p className="text-zinc-500 font-medium">Controle total sobre produtos e categorias.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setEditingProduct({ name: '', price: 0, category: categories[0]?.name || '', description: '', images: [], featured: false })}
            className="bg-brand text-white px-6 py-3 rounded-lg font-bold hover:bg-brand-dark transition-all flex items-center gap-2 shadow-lg shadow-brand/20 uppercase text-xs tracking-widest"
          >
            <Plus size={20} /> Novo Produto
          </button>
          <button onClick={handleLogout} className="text-zinc-400 hover:text-red-500 font-bold uppercase text-xs tracking-widest transition-colors">Sair</button>
        </div>
      </div>

      {/* Quick Stats as per theme */}
      <div className="bg-brand-dark rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between text-white shadow-xl shadow-brand-dark/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-32 -translate-y-32 group-hover:bg-white/10 transition-all"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center text-brand-light">
            <ShoppingBag size={28} />
          </div>
          <div>
            <h4 className="font-bold text-xl">Catálogo Ativo: <span className="text-brand-light">{products.length} itens</span></h4>
            <p className="text-sm opacity-70">Painel administrativo operando em modo de gestão total.</p>
          </div>
        </div>
        <div className="flex gap-4 relative z-10 mt-6 md:mt-0">
          <button 
            onClick={() => setActiveTab('catalog')}
            className={cn("px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest transition-all", activeTab === 'catalog' ? "bg-white text-brand-dark" : "hover:bg-white/10")}
          >
            Catálogo
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={cn("px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest transition-all", activeTab === 'orders' ? "bg-white text-brand-dark" : "hover:bg-white/10")}
          >
            Pedidos ({orders.length})
          </button>
          <button 
            onClick={() => setActiveTab('config')}
            className={cn("px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest transition-all", activeTab === 'config' ? "bg-white text-brand-dark" : "hover:bg-white/10")}
          >
            Personalização
          </button>
        </div>
      </div>

      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Products Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tighter">Produtos</h3>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden overflow-x-auto transition-colors">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-8 py-5 font-bold text-zinc-400 text-[10px] uppercase tracking-widest">Produto</th>
                    <th className="px-8 py-5 font-bold text-zinc-400 text-[10px] uppercase tracking-widest">Categoria</th>
                    <th className="px-8 py-5 font-bold text-zinc-400 text-[10px] uppercase tracking-widest">Preço</th>
                    <th className="px-8 py-5 font-bold text-zinc-400 text-[10px] uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-8 py-5 flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-100 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-200">
                          <img src={p.images?.[0]} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <span className="font-bold text-zinc-900 block">{p.name}</span>
                          {p.featured && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Destaque</span>}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-zinc-600 font-bold text-xs uppercase tracking-widest">{p.category}</td>
                      <td className="px-8 py-5 font-black text-zinc-900">R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setEditingProduct(p)} className="p-2 text-zinc-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-all"><Edit size={18} /></button>
                          <button onClick={() => deleteProduct(p.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Categories Sidebar */}
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-tighter">Categorias</h3>
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-6">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nova Categoria..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand outline-none transition-all"
                />
                <button 
                  onClick={addCategory}
                  className="bg-brand text-white p-2 rounded-lg hover:bg-brand-dark transition-all shadow-lg shadow-brand/20"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100 group">
                    {editingCategoryId === cat.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input 
                          type="text"
                          value={tempCategoryName}
                          onChange={(e) => setTempCategoryName(e.target.value)}
                          className="flex-1 px-2 py-1 bg-white border border-zinc-200 rounded text-xs focus:ring-1 focus:ring-brand outline-none"
                          autoFocus
                        />
                        <button onClick={() => updateCategory(cat.id, cat.name)} className="text-brand hover:scale-110 transition-transform"><Save size={14} /></button>
                        <button onClick={() => setEditingCategoryId(null)} className="text-zinc-400 hover:scale-110 transition-transform"><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-600">{cat.name}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setTempCategoryName(cat.name);
                            }}
                            className="p-1.5 text-zinc-300 hover:text-brand hover:bg-brand/5 rounded-md transition-all"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => deleteCategory(cat.id, cat.name)}
                            className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-center py-4 text-zinc-400 text-xs font-bold uppercase tracking-widest leading-loose">
                    Nenhuma categoria vinculada ao sistema.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase tracking-tighter">Histórico de Pedidos Geral</h3>
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-8 py-5 font-bold text-zinc-400 text-[10px] uppercase tracking-widest">Data / Usuário</th>
                  <th className="px-8 py-5 font-bold text-zinc-400 text-[10px] uppercase tracking-widest">Itens / Quantidade</th>
                  <th className="px-8 py-5 font-bold text-zinc-400 text-[10px] uppercase tracking-widest">Pagamento</th>
                  <th className="px-8 py-5 font-bold text-zinc-400 text-[10px] uppercase tracking-widest text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-xs">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="space-y-1">
                        <span className="block font-black text-zinc-900 uppercase tracking-tighter text-sm">
                          {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('pt-BR') : 'Recentemente'}
                        </span>
                        <span className="text-zinc-500">{order.userEmail}</span>
                      </div>
                    </td>
                      <td className="px-8 py-5 text-zinc-600">
                        <div className="space-y-1">
                          {order.items.map((item, i) => (
                            <div key={i}>
                              {item.quantity}x {item.product.name}
                              {item.selectedVariant && <span className="text-[10px] opacity-70"> ({item.selectedVariant.name})</span>}
                            </div>
                          ))}
                        </div>
                      </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1.5 bg-brand/10 text-brand font-black rounded text-[10px] uppercase tracking-widest">
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-sm text-zinc-900">
                      R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">
                      Nenhum pedido registrado no sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="max-w-2xl space-y-8">
          <h3 className="text-xl font-black uppercase tracking-tighter">Personalização da Home</h3>
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Título Principal</label>
              <input 
                type="text" 
                value={heroConfig.title} 
                onChange={(e) => setHeroConfig({ ...heroConfig, title: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-brand outline-none font-bold uppercase"
                placeholder="Ex: Renovando sua Paixão"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Subtítulo (Abaixo do Título)</label>
              <textarea 
                rows={3}
                value={heroConfig.subtitle} 
                onChange={(e) => setHeroConfig({ ...heroConfig, subtitle: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-brand outline-none font-medium"
                placeholder="Texto explicativo da empresa..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">URL da Imagem de Fundo (Hero)</label>
              <input 
                type="text" 
                value={heroConfig.imageUrl} 
                onChange={(e) => setHeroConfig({ ...heroConfig, imageUrl: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-brand outline-none font-medium"
                placeholder="https://images.unsplash.com/..."
              />
            </div>
            <button 
              onClick={saveHeroConfig}
              className="w-full py-4 bg-zinc-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 flex items-center justify-center gap-3"
            >
              <Save size={18} /> Atualizar Destaque Home
            </button>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white max-w-2xl w-full max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 flex flex-col"
          >
            <div className="p-8 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <h3 className="text-2xl font-black uppercase tracking-tighter">{editingProduct.id ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => setEditingProduct(null)} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-all"><X size={24} /></button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-[#fcfcfc] overflow-y-auto flex-1">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nome da Peça ou Acessório</label>
                <input 
                  type="text" 
                  value={editingProduct.name} 
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white rounded-lg border border-zinc-200 focus:ring-2 focus:ring-brand outline-none font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Preço (R$)</label>
                <input 
                  type="number" 
                  value={editingProduct.price} 
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white rounded-lg border border-zinc-200 focus:ring-2 focus:ring-brand outline-none font-bold text-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Categoria</label>
                <select 
                  value={editingProduct.category} 
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  className="w-full px-4 py-3 bg-white rounded-lg border border-zinc-200 focus:ring-2 focus:ring-brand outline-none font-bold text-xs uppercase tracking-widest"
                >
                  <option value="">Selecione...</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-full space-y-4">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Fotos do Produto (Máx 5)</label>
                
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-200">
                  {/* Upload Trigger */}
                  <label className="flex-shrink-0 w-24 h-24 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-brand hover:bg-brand/5 hover:text-brand transition-all text-zinc-400">
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []) as File[];
                        const newImages: string[] = [...(editingProduct.images || [])];
                        
                        for (const file of files) {
                          if (newImages.length >= 5) break;
                          const reader = new FileReader();
                          const promise = new Promise<string>((resolve) => {
                            reader.onload = (prev) => resolve(prev.target?.result as string);
                          });
                          reader.readAsDataURL(file);
                          const base64 = await promise;
                          newImages.push(base64);
                        }
                        setEditingProduct({ ...editingProduct, images: newImages });
                      }}
                      className="hidden" 
                    />
                    <Plus size={24} />
                    <span className="text-[8px] font-black uppercase mt-1">Anexar</span>
                  </label>

                  {/* Preview List */}
                  {editingProduct.images?.map((img, idx) => (
                    <div key={idx} className="flex-shrink-0 w-24 h-24 rounded-xl relative group border border-zinc-200 overflow-hidden bg-white">
                      <img src={img} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => {
                          const updated = (editingProduct.images || []).filter((_, i) => i !== idx);
                          setEditingProduct({ ...editingProduct, images: updated });
                        }}
                        className="absolute top-1 right-1 bg-white text-red-500 p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                      <div className="absolute bottom-1 left-2 bg-black/60 text-white text-[8px] px-1 rounded font-black uppercase tracking-widest">
                        {idx === 0 ? 'Capa' : `Foto ${idx + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Dica: A primeira foto será a capa principal no catálogo.</p>
              </div>

              <div className="col-span-full space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ou use links externos (URLs)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Cole um link de imagem aqui..."
                    value={imgUrlInput}
                    onChange={(e) => setImgUrlInput(e.target.value)}
                    className="flex-1 px-4 py-2 bg-white rounded-lg border border-zinc-200 focus:ring-2 focus:ring-brand outline-none font-medium text-xs"
                    onKeyDown={(e: any) => {
                      if (e.key === 'Enter' && e.target.value) {
                        const newImages = [...(editingProduct.images || []), e.target.value];
                        setEditingProduct({ ...editingProduct, images: newImages });
                        setImgUrlInput('');
                        e.preventDefault();
                      }
                    }}
                  />
                  <button 
                    onClick={() => {
                      if (imgUrlInput) {
                        const newImages = [...(editingProduct.images || []), imgUrlInput];
                        setEditingProduct({ ...editingProduct, images: newImages });
                        setImgUrlInput('');
                      }
                    }}
                    className="bg-zinc-100 px-4 rounded-lg text-[10px] font-black uppercase hover:bg-zinc-200 transition-all font-mono"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="col-span-full space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Descrição detalhada</label>
                <textarea 
                  rows={3}
                  value={editingProduct.description} 
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white rounded-lg border border-zinc-200 focus:ring-2 focus:ring-brand outline-none font-medium"
                />
              </div>

              {/* Variants Section */}
              <div className="col-span-full space-y-4 pt-4 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Variações de Preço (Cores/Modelos)</label>
                  <button 
                    onClick={() => {
                      const variants = [...(editingProduct.variants || []), { name: '', price: editingProduct.price || 0 }];
                      setEditingProduct({ ...editingProduct, variants });
                    }}
                    className="text-[9px] font-black text-brand bg-brand/10 px-2 py-1 rounded uppercase hover:bg-brand hover:text-white transition-all"
                  >
                    + Adicionar Variação
                  </button>
                </div>
                
                {editingProduct.variants && editingProduct.variants.length > 0 && (
                  <div className="space-y-3">
                    {editingProduct.variants.map((v, i) => (
                      <div key={i} className="flex gap-3 items-end">
                        <div className="flex-1 space-y-1">
                          <label className="text-[8px] font-bold text-zinc-400 uppercase">Nome (ex: Azul, Grande)</label>
                          <input 
                            type="text"
                            value={v.name}
                            onChange={(e) => {
                              const updated = [...(editingProduct.variants || [])];
                              updated[i].name = e.target.value;
                              setEditingProduct({ ...editingProduct, variants: updated });
                            }}
                            className="w-full px-3 py-2 bg-white rounded border border-zinc-200 text-xs focus:ring-1 focus:ring-brand outline-none"
                          />
                        </div>
                        <div className="w-24 space-y-1">
                          <label className="text-[8px] font-bold text-zinc-400 uppercase">Preço (R$)</label>
                          <input 
                            type="number"
                            value={v.price}
                            onChange={(e) => {
                              const updated = [...(editingProduct.variants || [])];
                              updated[i].price = parseFloat(e.target.value) || 0;
                              setEditingProduct({ ...editingProduct, variants: updated });
                            }}
                            className="w-full px-3 py-2 bg-white rounded border border-zinc-200 text-xs font-bold focus:ring-1 focus:ring-brand outline-none"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[8px] font-bold text-zinc-400 uppercase">Img da Var.</label>
                          <select 
                            value={v.image || ''}
                            onChange={(e) => {
                              const updated = [...(editingProduct.variants || [])];
                              updated[i].image = e.target.value;
                              setEditingProduct({ ...editingProduct, variants: updated });
                            }}
                            className="w-full px-3 py-2 bg-white rounded border border-zinc-200 text-[10px] focus:ring-1 focus:ring-brand outline-none"
                          >
                            <option value="">Nenhuma</option>
                            {editingProduct.images?.map((img, idx) => (
                              <option key={idx} value={img}>Foto {idx + 1}</option>
                            ))}
                          </select>
                        </div>
                        <button 
                          onClick={() => {
                            const updated = (editingProduct.variants || []).filter((_, idx) => idx !== i);
                            setEditingProduct({ ...editingProduct, variants: updated });
                          }}
                          className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-span-full flex items-center gap-3">
                <div className={cn(
                  "w-12 h-6 rounded-full p-1 cursor-pointer transition-all",
                  editingProduct.featured ? "bg-brand" : "bg-zinc-300"
                )}
                onClick={() => setEditingProduct({ ...editingProduct, featured: !editingProduct.featured })}
                >
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full transition-all transform",
                    editingProduct.featured ? "translate-x-6" : "translate-x-0"
                  )} />
                </div>
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-widest">Destaque na Home</label>
              </div>
            </div>
            <div className="p-8 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-4 shrink-0">
              <button onClick={() => setEditingProduct(null)} className="px-6 py-3 font-bold text-zinc-400 hover:text-zinc-900 transition-colors uppercase text-xs tracking-widest">Cancelar</button>
              <button 
                onClick={saveProduct}
                className="px-8 py-3 bg-brand text-white rounded-lg font-black uppercase tracking-widest text-xs hover:bg-brand-dark transition-all shadow-lg shadow-brand/20 flex items-center gap-2"
              >
                <Save size={18} /> Salvar Produto
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-zinc-900 text-white py-24 border-t border-zinc-800 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent"></div>
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-16 relative z-10">
        <div className="space-y-8">
          <Link to="/" className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-lg">
              <Logo />
            </div>
            <h1 className="font-display font-black text-2xl tracking-tighter uppercase">
              Renan <span className="text-brand">Adesivos</span>
            </h1>
          </Link>
          <p className="text-zinc-500 font-medium leading-relaxed">
            Sua referência em adesivos de alta performance. Qualidade, estilo e durabilidade para transformar qualquer superfície.
          </p>
        </div>
        <div>
          <h4 className="font-display font-black text-xs uppercase tracking-[0.2em] text-zinc-300 mb-8">Navegação</h4>
          <ul className="space-y-4 text-zinc-500 font-bold text-sm uppercase tracking-widest">
            <li><Link to="/" className="hover:text-brand transition-colors">Início</Link></li>
            <li><Link to="/produtos" className="hover:text-brand transition-colors">Produtos</Link></li>
            <li><Link to="/perfil" className="hover:text-brand transition-colors">Perfil</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-black text-xs uppercase tracking-[0.2em] text-zinc-300 mb-8">Contato</h4>
          <ul className="space-y-4 text-zinc-500 font-medium">
            <li className="flex items-center gap-3"><Phone size={18} className="text-brand" /> (81) 98606-3791</li>
            <li className="flex items-center gap-3"><Mail size={18} className="text-brand" /> renanadesivo2018@gmail.com</li>
            <li className="flex items-center gap-3 italic">Av. Expedecionario Francisco Vitoriano, 111 - Ur-5</li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-black text-xs uppercase tracking-[0.2em] text-zinc-300 mb-8">Social</h4>
          <div className="flex items-center gap-4">
            <a href="https://www.instagram.com/renan_adesivo/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center hover:bg-brand transition-all text-white"><Instagram size={24} /></a>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-8 mt-24 pt-8 border-t border-white/5 text-center text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">
        &copy; {new Date().getFullYear()} Renan Adesivo &bull; Transformando com Estilo
      </div>
    </footer>
  );
}

function AppContent({ user }: { user: any }) {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-zinc-50 transition-colors">
      <Header user={user} />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/produtos" element={<CatalogPage />} />
          <Route path="/perfil" element={<ProfilePage user={user} />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<div className="min-h-screen flex items-center justify-center font-display font-black uppercase text-zinc-400">Página não encontrada.</div>} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer />
      <ProductViewModal />
      <FloatingWhatsApp />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, variant?: ProductVariant) => {
    setCart(prev => {
      const existing = prev.find(item => 
        item.product.id === product.id && 
        item.selectedVariant?.name === variant?.name
      );
      if (existing) {
        return prev.map(item => 
          (item.product.id === product.id && item.selectedVariant?.name === variant?.name)
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { id: Math.random().toString(36).substr(2, 9), product, quantity: 1, selectedVariant: variant }];
    });
    setIsOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);
  const total = cart.reduce((acc, item) => {
    const price = item.selectedVariant ? item.selectedVariant.price : item.product.price;
    return acc + (price * item.quantity);
  }, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total, isOpen, setIsOpen, viewProduct, setViewProduct, searchTerm, setSearchTerm }}>
      <Router>
        <AppContent user={user} />
      </Router>
    </CartContext.Provider>
  );
}

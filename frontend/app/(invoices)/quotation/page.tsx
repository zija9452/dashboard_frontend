'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiErrorMessage } from '@/lib/apiError';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import {
  CustomerCategoryGrouped,
  PricedLine,
  tierForQuantity,
  isQtyTier,
  lookupIdealPrice,
  piecesOfCategory,
  repriceCart,
  mockupLines,
  categoryTierSummaries,
  kitFlatDefault,
  findArticle,
  ReadyArticle,
  needsMockup,
  isDyeLine,
  dyePiecesOfCategory,
  formDyePieces,
  lineDyeMultiplier,
  teamsIn,
  mockupKey,
  MockupLine,
  MOCKUP_MAX_PIECES,
} from '@/lib/quantityPricing';
import { QuantityTierCards } from '@/components/QuantityTierCards';
import TeamSearchInput, { KitKindChips } from '@/components/TeamSearchInput';
import { AmountInput, QtyInput } from '@/components/CartNumberInputs';
import { DtfSettings, DtfLogo, computeDtf, dtfLogosLabel, dtfTotalOf, metersLabel } from '@/lib/dtfLayout';
import { DtfLogoBox } from '@/components/DtfLogos';
import AddCustomerModal from '@/components/AddCustomerModal';

interface Customer {
  cus_id: string;
  cus_name: string;
  cus_phone: string;
}

// Every line has a team (typed in Team Name above the item form). `group` = id of the
// line it was added from with "+ Similar" - it is listed right under that line.
type CartItem = PricedLine & { team: string; group?: string | null };

// Cart filter: all teams together (default) or one team.
const ALL_TEAMS = '__all_teams__';

// Trimmed, single-spaced, no "|" (used in the flat charge keys); 100 chars like the backend.
const cleanTeamName = (value: string) => value.replace(/\|/g, ' ').trim().replace(/\s+/g, ' ').slice(0, 100);

// Cart lines in display/save order: teams in the order they were first added; in each
// team the lines in order, with each line's "+ Similar" lines right under it.
const orderedLines = (cart: CartItem[]): CartItem[] => {
  const ids = new Set(cart.map(i => i.id));
  return teamsIn(cart).flatMap(team => {
    const lines = cart.filter(i => i.team === team);
    const firsts = lines.filter(i => !i.group || !ids.has(i.group));
    return firsts.flatMap(first => [first, ...lines.filter(i => i.group === first.id)]);
  });
};

// DRAFT / SENT / REJECTED can be revised; APPROVED and CONVERTED are locked (backend checks too).
const REVISABLE = ['DRAFT', 'SENT', 'REJECTED'];

// The quotation being revised (opened from View Quotations with ?revise=<id>).
interface RevisingQuotation {
  id: string;
  quotation_no: string;
  revision: number;
}

// A saved quotation as GET /api/quotation/<id> returns it (only what a revision needs).
interface SavedQuotation {
  quotation_no: string;
  revision: number;
  status: string;
  replaced_by_id: string | null;
  customer_id: string | null;
  team_name: string | null;
  required_by_date: string | null;
  discounts: number;
  rush_rate_snapshot: number | null;
  totals: { mockup_charges?: { category: string; amount: number; team?: string }[] };
  items: {
    product_name: string;
    cat_name: string;
    unit_price: number;
    quantity: number;
    category_fields?: string;
    dtf?: { logos: { w: number; h: number }[]; charge: number; amount: number };
    team?: string;
    similar_of?: number; // 1-based line number of the line it was added "+ Similar" from
  }[];
}

const QuotationPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerCategories, setCustomerCategories] = useState<CustomerCategoryGrouped[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [requiredByDate, setRequiredByDate] = useState('');

  // Team Name box at the top of the item form. Emptied after every Add; "+ Similar"
  // fills it with that line's team.
  const [teamInput, setTeamInput] = useState('');
  // Cart filter - ALL_TEAMS or one team name.
  const [cartView, setCartView] = useState(ALL_TEAMS);
  // Id of the line "+ Similar" was clicked on - the next Add goes right under it.
  const [similarOf, setSimilarOf] = useState<string | null>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const itemFormRef = useRef<HTMLDivElement>(null);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [dynamicCategoryFields, setDynamicCategoryFields] = useState<Record<string, string>>({});
  // Whether the optional fields (Rib, Zip...) are revealed - hidden by default,
  // shown via the "+" button below the required fields.
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  // DTF logos (width x height on one piece) for a category with dtf_enabled - see lib/dtfLayout.ts.
  const [dtfLogos, setDtfLogos] = useState<DtfLogo[]>([]);
  const [dtfSettings, setDtfSettings] = useState<DtfSettings | null>(null);
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [priceWasAutoFilled, setPriceWasAutoFilled] = useState(false);
  const [quantity, setQuantity] = useState<number | ''>('');
  const [price, setPrice] = useState<number>(0);

  const [cart, setCart] = useState<CartItem[]>([]);
  // Revise mode: the cart and customer fields are pre-filled from this quotation, and
  // saving creates its next revision instead of a new quotation.
  const [revising, setRevising] = useState<RevisingQuotation | null>(null);
  const [loadingRevision, setLoadingRevision] = useState(false);
  const revisionRequested = useRef(false);
  // The revision is filled in once both of these have answered (ok or not).
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [dtfSettingsLoaded, setDtfSettingsLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [discount, setDiscount] = useState<number | ''>('');

  // PDF modal - shown right after creating a quotation instead of redirecting away
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfFilename, setPdfFilename] = useState<string>('');
  // Blurred loading overlay while the PDF is being fetched - same pattern as
  // customer-invoice/page.tsx's loadingReceipt.
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Fetched once so the rush charge can be previewed live in the UI, the same way
  // the backend will compute it on submit (deadline within threshold_days => rush).
  const [rushRatePerPiece, setRushRatePerPiece] = useState<number | null>(null);
  const [rushThresholdDays, setRushThresholdDays] = useState<number | null>(null);
  // Per-piece rush rate actually charged - pre-filled with the default above, but
  // editable by the cashier (like the item Rate field). Sent to the backend on save.
  const [rushRate, setRushRate] = useState<number | ''>('');
  // Designing / mockup ("flat") charge per team and category with 1-4 pcs - each
  // category's own amount (customer_categories.mockup_charge), editable per order in the
  // cart. Keyed by mockupKey(team, category).
  const [mockupAmounts, setMockupAmounts] = useState<Record<string, number>>({});
  // Our ready articles (products without size) for the Team Name search and the kit flat.
  const [articles, setArticles] = useState<ReadyArticle[]>([]);
  const [articlesLoaded, setArticlesLoaded] = useState(false);
  // Default flat of a team + category: the category's own charge (e.g. Jacket 1000; not
  // set or 0 = none), or the kit flat / 0 for our ready article - see kitFlatDefault.
  const flatDefault = (category: string, team: string, items: PricedLine[] = cart) =>
    kitFlatDefault(items, customerCategories, articles, category, team);
  const mockupDefaultFor = (category: string, team: string, items: PricedLine[] = cart) => flatDefault(category, team, items).amount;
  const mockupAmountOf = (team: string, category: string) => mockupAmounts[mockupKey(team, category)] ?? mockupDefaultFor(category, team);

  // Teams in the order they were first added; a team leaves when its last line is removed.
  const teams = teamsIn(cart);
  // The typed name, matched to a team already in the cart (or one of our articles)
  // regardless of case/spaces.
  const typedTeam = cleanTeamName(teamInput);
  const activeTeam = teams.find(t => t.toLowerCase() === typedTeam.toLowerCase()) ?? findArticle(articles, typedTeam)?.name ?? typedTeam;
  const activeArticle = findArticle(articles, activeTeam);
  const similarLine = similarOf ? cart.find(i => i.id === similarOf) ?? null : null;

  const categoryData = customerCategories.find(cat => cat.main_category === selectedCategory);
  const allOptionsSelected = !!categoryData && categoryData.sub_categories.length > 0 &&
    categoryData.sub_categories.filter(sc => !sc.is_optional).every(sc => !!dynamicCategoryFields[sc.sub_category]);
  // The tier comes from every piece of this category in this team: what's already in
  // the cart for the team + the quantity being entered.
  const piecesAlreadyInCart = selectedCategory ? piecesOfCategory(cart, selectedCategory, activeTeam) : 0;
  const tierPieces: number | '' = quantity === '' ? '' : quantity + piecesAlreadyInCart;
  const entryIsDye = isDyeLine(customerCategories.find(c => c.main_category === selectedCategory), dynamicCategoryFields);
  const matchedIdealPrice = lookupIdealPrice(
    categoryData, dynamicCategoryFields, tierPieces,
    formDyePieces(cart, customerCategories, selectedCategory, dynamicCategoryFields, quantity, activeTeam)
  );
  // Roll layout + charge for the logos being entered, re-worked on every keystroke.
  const dtfResult = useMemo(
    () => (categoryData?.dtf_enabled ? computeDtf(dtfLogos, quantity, dtfSettings) : computeDtf([], '', null)),
    [categoryData?.dtf_enabled, dtfLogos, quantity, dtfSettings]
  );

  // Whenever the selected combination (or the quantity, which can flip the rate
  // tier) resolves to a fixed price, fill it straight into the editable Rate field
  // - no separate read-only "ideal price" box. Staff can still type over it.
  useEffect(() => {
    if (matchedIdealPrice !== null) {
      setUnitPrice(matchedIdealPrice);
      setPriceWasAutoFilled(true);
    } else if (priceWasAutoFilled) {
      // The combination changed (e.g. a different Fabric option with no ideal price
      // set yet) and no longer matches - clear the stale auto-filled value instead of
      // carrying over the previous combination's price. A manually-typed price
      // (priceWasAutoFilled false) is left alone.
      setUnitPrice('');
      setPriceWasAutoFilled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedIdealPrice]);

  useEffect(() => {
    fetchCustomers();
    fetchCustomerCategories();
    fetchRushSettings();
    fetchDtfSettings();
    fetchArticles();
  }, []);

  useEffect(() => {
    if (unitPrice !== '' && quantity !== '') {
      setPrice(unitPrice * quantity);
    } else {
      setPrice(0);
    }
  }, [unitPrice, quantity]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers/viewcustomer?page=1&limit=1000', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchCustomerCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch('/api/customer-category/grouped', { method: 'GET', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        // Prices (ideal_prices, per quantity tier) and modifiers come from the DB,
        // entered via the /ideal-pricing page.
        setCustomerCategories(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching customer categories:', error);
    } finally {
      setLoadingCategories(false);
      setCategoriesLoaded(true);
    }
  };

  // Rush rule, saved on the Ideal Pricing page.
  const fetchRushSettings = async () => {
    try {
      const response = await fetch('/api/rush-pricing/', { method: 'GET', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setRushRatePerPiece(Number(data.price_per_piece));
        setRushThresholdDays(Number(data.threshold_days));
        setRushRate(Number(data.price_per_piece));
      }
    } catch (error) {
      console.error('Error fetching rush settings:', error);
    }
  };

  // DTF rule (Rs per 0.5 m, roll width, gap), saved on the Ideal Pricing page.
  const fetchDtfSettings = async () => {
    try {
      const response = await fetch('/api/dtf-pricing/', { method: 'GET', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setDtfSettings({
          price_per_half_meter: Number(data.price_per_half_meter),
          roll_width_in: Number(data.roll_width_in),
          gap_in: Number(data.gap_in),
        });
      }
    } catch (error) {
      console.error('Error fetching DTF settings:', error);
    } finally {
      setDtfSettingsLoaded(true);
    }
  };

  // Our ready articles - new products show up here by themselves.
  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/ready-articles', { method: 'GET', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setArticles(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching ready articles:', error);
    } finally {
      setArticlesLoaded(true);
    }
  };

  // ?revise=<id>: show the loader straight away, so the page never looks like an empty
  // New Quotation while the price list, DTF rule and the quotation itself load.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('revise')) setLoadingRevision(true);
  }, []);

  // ...and fill it in once the price list and DTF rule have answered.
  useEffect(() => {
    if (revisionRequested.current || !categoriesLoaded || !dtfSettingsLoaded || !articlesLoaded) return;
    const reviseId = new URLSearchParams(window.location.search).get('revise');
    if (!reviseId) return;
    revisionRequested.current = true;
    loadRevision(reviseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesLoaded, dtfSettingsLoaded, articlesLoaded]);

  const loadRevision = async (id: string) => {
    setLoadingRevision(true);
    try {
      const response = await fetch(`/api/quotation/${id}`, { method: 'GET', credentials: 'include' });
      if (!response.ok) {
        showToast('Quotation not found', 'error');
        router.replace('/quotation');
        return;
      }
      const data: SavedQuotation = await response.json();
      if (!REVISABLE.includes(data.status) || data.replaced_by_id) {
        showToast(`${data.quotation_no} Rev.${data.revision} is ${data.status} - it can't be revised`, 'error');
        router.replace('/quotation');
        return;
      }

      // Lines keep their saved rates. A line whose rate is still the price-list rate stays
      // auto-priced (moves with the qty tier); any other rate is kept as a manual rate.
      // DTF is worked out again with the current DTF rule.
      const droppedDtf: number[] = [];
      // A quotation saved before teams has no team per line - its lines all go to its
      // Team Name.
      const oldTeam = cleanTeamName(data.team_name || '') || 'Team 1';
      const stamp = Date.now();
      const lines: CartItem[] = data.items.map((item, index) => {
        let fields: Record<string, string> = {};
        try { fields = JSON.parse(item.category_fields || '{}'); } catch { fields = {}; }
        let dtf: CartItem['dtf'] = null;
        if (item.dtf) {
          const result = computeDtf(item.dtf.logos, item.quantity, dtfSettings);
          if (result.status === 'ok') {
            // An amount staff had changed (or waived) is kept; otherwise the new charge applies.
            const edited = item.dtf.amount !== item.dtf.charge;
            dtf = { ...result.block, amount: edited ? item.dtf.amount : result.block.charge };
          } else {
            droppedDtf.push(index + 1);
          }
        }
        return {
          id: `${stamp}-${index}`,
          category: item.cat_name || item.product_name,
          unitPrice: item.unit_price,
          quantity: item.quantity,
          totalPrice: item.unit_price * item.quantity,
          category_fields: fields,
          autoPriced: false,
          dtf,
          team: cleanTeamName(item.team || '') || oldTeam,
          group: item.similar_of ? `${stamp}-${item.similar_of - 1}` : null,
        };
      });
      const priced = lines.map(line => {
        const categoryForLine = customerCategories.find(c => c.main_category === line.category);
        const listRate = lookupIdealPrice(
          categoryForLine, line.category_fields || {},
          piecesOfCategory(lines, line.category, line.team), dyePiecesOfCategory(lines, customerCategories, line.category, line.team)
        );
        return { ...line, autoPriced: listRate !== null && listRate === line.unitPrice };
      });
      updateCart(priced);

      // Mockup amounts as saved (an entry without a team belongs to oldTeam). A team +
      // category that needed a mockup but isn't in the saved list had it waived (0 rows
      // aren't saved), so it stays 0.
      const amounts: Record<string, number> = Object.fromEntries(
        (data.totals.mockup_charges || []).map(m => [mockupKey(cleanTeamName(m.team || '') || oldTeam, m.category), Number(m.amount)])
      );
      for (const team of teamsIn(priced)) {
        for (const category of Array.from(new Set(priced.filter(l => l.team === team).map(l => l.category)))) {
          const key = mockupKey(team, category);
          if (!(key in amounts) && needsMockup(priced, customerCategories, category, team) && mockupDefaultFor(category, team, priced) > 0) amounts[key] = 0;
        }
      }
      setMockupAmounts(amounts);

      setSelectedCustomer(data.customer_id || '');
      setRequiredByDate(data.required_by_date || '');
      setDiscount(data.discounts ? data.discounts : '');
      if (data.rush_rate_snapshot !== null) setRushRate(data.rush_rate_snapshot);
      setRevising({ id, quotation_no: data.quotation_no, revision: data.revision });

      if (droppedDtf.length) {
        showToast(`DTF of item ${droppedDtf.join(', ')} doesn't fit the current DTF rule - remove the item and add it again`, 'error');
      }
    } catch (error) {
      console.error('Error loading quotation to revise:', error);
      showToast('Failed to load the quotation', 'error');
    } finally {
      setLoadingRevision(false);
    }
  };

  // Leave revise mode without saving - back to the list, the old quotation is unchanged.
  const cancelRevision = () => {
    setRevising(null);
    setCart([]);
    setSelectedCustomer('');
    setTeamInput('');
    setCartView(ALL_TEAMS);
    setSimilarOf(null);
    setRequiredByDate('');
    setDiscount('');
    setRushRate(rushRatePerPiece ?? '');
    setMockupAmounts({});
    router.push('/view-quotation');
  };

  const clearItemForm = () => {
    setSelectedCategory('');
    setUnitPrice('');
    setPriceWasAutoFilled(false);
    setQuantity('');
    setPrice(0);
    setDynamicCategoryFields({});
    setShowOptionalFields(false);
    setDtfLogos([]);
  };

  const addToCart = () => {
    if (!activeTeam) {
      showToast('Please enter team name', 'error');
      return;
    }
    if (!selectedCategory) {
      showToast('Please select a category', 'error');
      return;
    }

    if (categoryData && categoryData.sub_categories.length > 0) {
      // Optional sub-categories (Rib, Zip...) are fine left blank.
      const missingFields = categoryData.sub_categories.filter(
        sc => !sc.is_optional && (!dynamicCategoryFields[sc.sub_category] || !dynamicCategoryFields[sc.sub_category].trim())
      );
      if (missingFields.length > 0) {
        showToast(`Please select: ${missingFields.map(sc => sc.sub_category).join(', ')}`, 'error');
        return;
      }
    }

    if (unitPrice === '' || unitPrice <= 0) {
      showToast('Please enter a valid unit price', 'error');
      return;
    }
    if (quantity === '' || quantity <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }
    if (dtfResult.status === 'error') {
      showToast(`DTF: ${dtfResult.message}`, 'error');
      return;
    }

    const newItem: CartItem = {
      id: Date.now().toString(),
      category: selectedCategory,
      unitPrice,
      quantity,
      totalPrice: price,
      category_fields: { ...dynamicCategoryFields },
      // Only a rate still equal to the price-list rate is re-priced later; a rate the
      // staff typed stays as typed.
      autoPriced: priceWasAutoFilled && matchedIdealPrice !== null && unitPrice === matchedIdealPrice,
      dtf: dtfResult.status === 'ok' ? dtfResult.block : null,
      team: activeTeam,
      // Listed under the "+ Similar" line only while it's still the same team and category.
      group: similarLine && similarLine.team === activeTeam && similarLine.category === selectedCategory ? similarLine.id : null,
    };

    updateCart([...cart, newItem]);
    clearItemForm();
    // Team Name stays (shown with its spelling), so the rest of the kit - Short, Trouser -
    // goes to the same team; clicking into the box selects it to type another team.
    setTeamInput(activeTeam);
    setSimilarOf(null);
  };

  // Every add/remove re-prices the auto-priced lines from their team + category's new
  // total. No toast - the change shows in the cart itself (tier cards, rate tags, mockup rows).
  const updateCart = (next: CartItem[]) => {
    const { items } = repriceCart(next, customerCategories);
    // A team + category that left the cart forgets its edited mockup amount.
    setMockupAmounts(prev => Object.fromEntries(Object.entries(prev).filter(([key]) => items.some(i => mockupKey(i.team, i.category) === key))));
    setCart(items);
    // A team whose last line was removed leaves the filter.
    if (cartView !== ALL_TEAMS && !items.some(i => i.team === cartView)) setCartView(ALL_TEAMS);
  };

  const removeFromCart = (id: string) => {
    // A first line removed: its first "+ Similar" line takes its place and the rest of
    // the group moves under that one.
    const heir = cart.find(item => item.group === id);
    const next = cart.flatMap(item =>
      item.id === id ? (heir ? [{ ...heir, group: null }] : [])
      : heir && item.id === heir.id ? []
      : [item.group === id && heir ? { ...item, group: heir.id } : item]);
    if (similarOf === id) setSimilarOf(heir ? heir.id : null);
    updateCart(next);
  };

  // "+ Similar": the line's team, category and options go into the form; only the
  // quantity is left to enter. The new line is listed right under this one.
  const addSimilar = (line: CartItem) => {
    setTeamInput(line.team);
    setSimilarOf(line.group || line.id);
    setSelectedCategory(line.category);
    setDynamicCategoryFields({ ...(line.category_fields || {}) });
    const lineCategory = customerCategories.find(c => c.main_category === line.category);
    setShowOptionalFields(!!lineCategory?.sub_categories.some(sc => sc.is_optional && line.category_fields?.[sc.sub_category]));
    setDtfLogos([]);
    setUnitPrice('');
    setPriceWasAutoFilled(false);
    setQuantity('');
    itemFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => quantityInputRef.current?.focus({ preventScroll: true }), 0);
  };

  // For a line whose tier has no price in the list: the rate typed here makes it a
  // manual line (never re-priced) and clears the warning.
  const setLineRate = (id: string, rate: number) => {
    setCart(cart.map(item => item.id === id
      ? { ...item, unitPrice: rate, totalPrice: rate * item.quantity, autoPriced: false, missingTierPrice: false, previousUnitPrice: null, rateChange: null }
      : item));
  };

  // Qty edited in the cart: the line total, its team + category's rate tier (repriceCart),
  // MOQ and DTF all follow. False = not taken (bad qty, or a DTF that doesn't fit it).
  const setLineQty = (id: string, qty: number): boolean => {
    const item = cart.find(i => i.id === id);
    if (!item || !Number.isInteger(qty) || qty <= 0) return false;
    if (qty === item.quantity) return true;
    let dtf = item.dtf;
    if (dtf) {
      const result = computeDtf(dtf.logos, qty, dtfSettings);
      if (result.status !== 'ok') {
        showToast(`DTF: ${result.status === 'error' ? result.message : 'cannot work out the DTF for this qty'}`, 'error');
        return false;
      }
      const edited = dtf.amount !== dtf.charge;
      dtf = { ...result.block, amount: edited ? dtf.amount : result.block.charge };
    }
    updateCart(cart.map(i => (i.id === id ? { ...i, quantity: qty, totalPrice: i.unitPrice * qty, dtf } : i)));
    return true;
  };

  // DTF amount of one line, edited in its team's block in the cart (like the mockup amount).
  const setDtfAmount = (id: string, amount: number) => {
    setCart(cart.map(item => (item.id === id && item.dtf ? { ...item, dtf: { ...item.dtf, amount } } : item)));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const dtfTotal = dtfTotalOf(cart);
  const totalPieces = cart.reduce((sum, item) => sum + item.quantity, 0);
  const mockups = mockupLines(cart, customerCategories, mockupAmounts, mockupDefaultFor);
  const mockupTotal = mockups.reduce((sum, m) => sum + m.amount, 0);
  const linesMissingPrice = cart.filter(item => item.missingTierPrice);

  // MOQ Charges of the line being entered = what it adds to its team + category's flat
  // (0 when that flat is already in the cart, or for a free kit line). Line Total adds it.
  const moq = (() => {
    if (!activeTeam || !selectedCategory || quantity === '' || quantity <= 0) return { amount: 0, reason: '' };
    const key = mockupKey(activeTeam, selectedCategory);
    const before = mockups.find(m => m.key === key);
    const withLine: CartItem[] = [...cart, {
      id: '__new__', category: selectedCategory, unitPrice: unitPrice || 0, quantity, totalPrice: price,
      category_fields: { ...dynamicCategoryFields }, autoPriced: false, team: activeTeam,
    }];
    const after = mockupLines(withLine, customerCategories, mockupAmounts, mockupDefaultFor).find(m => m.key === key);
    if (before) return { amount: 0, reason: `Already added for ${activeTeam} · ${selectedCategory} (Rs. ${before.amount})` };
    if (after) return { amount: after.amount, reason: flatDefault(selectedCategory, activeTeam, withLine).reason };
    if (tierPieces !== '' && tierPieces > MOCKUP_MAX_PIECES) return { amount: 0, reason: `${tierPieces} pcs (${MOCKUP_MAX_PIECES + 1}+) - no MOQ charges` };
    if (entryIsDye) return { amount: 0, reason: 'Dye - the dye rate applies instead' };
    const kit = flatDefault(selectedCategory, activeTeam, withLine);
    return { amount: 0, reason: kit.amount === 0 && findArticle(articles, activeTeam) ? kit.reason : '' };
  })();

  // Per team: its lines (display order), pieces, flat charges and total (lines + flat + DTF).
  const teamBlocks = teams.map(team => {
    const lines = orderedLines(cart).filter(i => i.team === team);
    const flats: MockupLine[] = mockups.filter(m => m.team === team);
    const flatTotal = flats.reduce((sum, m) => sum + m.amount, 0);
    return {
      team,
      lines,
      flats,
      flatTotal,
      pieces: lines.reduce((sum, i) => sum + i.quantity, 0),
      total: lines.reduce((sum, i) => sum + i.totalPrice, 0) + flatTotal + dtfTotalOf(lines),
      tierSummaries: categoryTierSummaries(cart, customerCategories, c => mockupAmountOf(team, c), c => mockupDefaultFor(c, team) > 0, team),
    };
  });
  const shownBlocks = cartView === ALL_TEAMS ? teamBlocks : teamBlocks.filter(b => b.team === cartView);

  // Live preview of what the backend will compute on submit: rush applies when the
  // deadline falls within threshold_days of today (inclusive), charged per piece
  // across the whole cart.
  let estimatedIsRush = false;
  let deadlineDaysLeft: number | null = null;
  if (requiredByDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(`${requiredByDate}T00:00:00`);
    deadlineDaysLeft = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (rushThresholdDays !== null) estimatedIsRush = deadlineDaysLeft <= rushThresholdDays;
  }
  const deadlineLabel = deadlineDaysLeft === null ? ''
    : deadlineDaysLeft <= 0 ? 'today'
    : deadlineDaysLeft === 1 ? 'tomorrow'
    : `in ${deadlineDaysLeft} days`;
  // An emptied rush rate box counts as 0 (no rush charge), both here and on save.
  const rushRateValue = rushRate === '' ? 0 : rushRate;
  const estimatedRushCharge = estimatedIsRush ? rushRateValue * totalPieces : 0;
  const estimatedTotal = cartSubtotal - (discount || 0) + estimatedRushCharge + mockupTotal + dtfTotal;

  const handleSubmit = async () => {
    if (cart.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }
    if (!selectedCustomer) {
      showToast('Please select a customer', 'error');
      return;
    }
    if (!requiredByDate) {
      showToast('Please enter the deadline (Required By date)', 'error');
      return;
    }
    if (linesMissingPrice.length > 0) {
      showToast(`Enter the rate for ${linesMissingPrice.length} item(s) marked "no price for this tier"`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const customer = customers.find(c => c.cus_id === selectedCustomer);

      // Saved in display order (grouped by team, "+ Similar" lines under their line), so
      // the PDF and bills list them the same way; similar_of = that line's number.
      const ordered = orderedLines(cart);
      const lineNo = new Map(ordered.map((item, index) => [item.id, index + 1]));
      const items = ordered.map(item => ({
        pro_name: item.category,
        cat_name: item.category,
        unit_price: item.unitPrice,
        pro_quantity: item.quantity,
        total_price: item.totalPrice,
        category_fields: JSON.stringify(item.category_fields || {}),
        ...(item.dtf ? { dtf: item.dtf } : {}),
        team: item.team,
        ...(item.group && lineNo.has(item.group) ? { similar_of: lineNo.get(item.group) } : {}),
      }));

      const payload = {
        customer_id: selectedCustomer || null,
        customer_name: customer?.cus_name || null,
        team_name: teams.join(', ') || null, // the backend saves the same from the items
        items: JSON.stringify(items),
        required_by_date: requiredByDate,
        discounts: discount || 0,
        rush_rate_per_piece: rushRateValue,
        rush_threshold_days: rushThresholdDays,
        mockup_charges: mockups.map(m => ({ team: m.team, category: m.category, amount: m.amount })),
      };

      // A revision is saved against the old quotation (it becomes REVISED, this is Rev.N+1).
      const response = await fetch(revising ? `/api/quotation/${revising.id}/revise` : '/api/quotation/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await Swal.fire({
          title: revising ? 'Revision Saved!' : 'Quotation Created!',
          html: `<p><strong>${result.quotation_no}${result.revision > 1 ? ` (Rev.${result.revision})` : ''}</strong></p>` +
                (revising ? `<p style="color:#6B7280;">Rev.${revising.revision} is now REVISED (PDF only).</p>` : '') +
                (result.is_rush ? `<p style="color:#EA580C;font-weight:bold;">RUSH ORDER - Rs. ${result.rush_charge} rush charge (Rs. ${result.rush_rate_per_piece ?? 0} per piece × ${result.total_pieces ?? totalPieces} pcs)</p>` : '<p>Normal order (not rush)</p>') +
                (result.mockup_charge > 0 ? `<p style="color:#7E22CE;">MOQ Charges - Rs. ${result.mockup_charge}</p>` : '') +
                (result.dtf_charge > 0 ? `<p style="color:#0F766E;">DTF printing - Rs. ${result.dtf_charge}</p>` : '') +
                `<p>Total: Rs. ${result.total_amount}</p>`,
          icon: 'success',
        });
        setCart([]);
        setSelectedCustomer('');
        setTeamInput('');
        setCartView(ALL_TEAMS);
        setSimilarOf(null);
        setRequiredByDate('');
        setDiscount('');
        setRushRate(rushRatePerPiece ?? '');
        setMockupAmounts({});
        if (revising) {
          setRevising(null);
          router.replace('/quotation'); // drop ?revise= so a refresh doesn't load the old one again
        }

        // Same blob-building pattern as view-quotation/page.tsx's handleViewPdf -
        // show the PDF right here instead of redirecting to /view-quotation.
        setLoadingPdf(true);
        try {
          const pdfResponse = await fetch(`/api/quotation/${result.quotation_id}/pdf`, { method: 'GET', credentials: 'include' });
          const pdfResult = await pdfResponse.json();
          if (pdfResponse.ok && pdfResult.pdf_base64) {
            const byteChars = atob(pdfResult.pdf_base64);
            const byteNumbers = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
            const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setPdfFilename(pdfResult.filename || 'quotation.pdf');
            setShowPdfModal(true);
          }
        } catch (pdfError) {
          console.error('Error loading PDF:', pdfError);
        } finally {
          setLoadingPdf(false);
        }
      } else {
        showToast(apiErrorMessage(result, revising ? 'Failed to save the revision' : 'Failed to create quotation'), 'error');
      }
    } catch (error) {
      console.error('Error creating quotation:', error);
      showToast('Failed to create quotation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[98%] md:max-w-[95%] mx-auto px-2 md:px-4 py-4">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-regal-black">
            {revising ? `Revise ${revising.quotation_no} (Rev.${revising.revision})` : 'New Quotation'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">A price offer for the customer - converts into a real order once approved.</p>
        </div>
        <button onClick={() => router.push('/view-quotation')} className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap">
          View Quotations
        </button>
      </div>

      {/* Same blurred loader as the PDF one below - until the quotation is filled in */}
      {loadingRevision && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-[100]" role="status" aria-live="polite">
          <div className="bg-white rounded-lg px-8 py-6 shadow-xl flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-regal-orange" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-regal-black font-medium">Loading quotation to revise...</span>
          </div>
        </div>
      )}
      {revising && (
        <div className="mb-4 p-3 rounded-lg border border-amber-300 bg-amber-50 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-amber-900">
            Revising <b>{revising.quotation_no} Rev.{revising.revision}</b>. Saving creates <b>Rev.{revising.revision + 1}</b>;
            Rev.{revising.revision} becomes REVISED (PDF only). Change anything below - items, rates, customer, deadline.
          </p>
          <button type="button" onClick={cancelRevision} className="text-sm font-medium text-amber-900 underline hover:no-underline">
            Cancel revision
          </button>
        </div>
      )}

      {/* Left: build what's being ordered (category, options, price, quantity) first.
          Right: cart on top, customer/deadline + submit at the bottom - same split as
          the Customer Invoice builder, so item entry always comes before customer info. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        {/* Left Side - Add Item Form */}
        <div className="lg:col-span-1">
          <div ref={itemFormRef} className="regal-card p-3 md:p-6 sticky lg:top-16 scroll-mt-20">
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Add Item</h2>

            <div className="space-y-3 md:space-y-4">
              {/* Team first: every line belongs to a team; flat charges and rate tiers are per team. */}
              <div>
                <label htmlFor="quotation-team" className="block text-sm font-medium mb-1">Team Name *</label>
                <TeamSearchInput
                  id="quotation-team"
                  value={teamInput}
                  onChange={setTeamInput}
                  // Leaving the box fixes the spelling to the team / article ("royal fc" -> "Royal FC").
                  onBlur={() => { if (teams.includes(activeTeam) || activeArticle) setTeamInput(activeTeam); }}
                  teams={teamBlocks.map(b => ({ name: b.team, pieces: b.pieces }))}
                  articles={articles}
                  orderLabel="quotation"
                />
                <p className="text-xs text-gray-600 mt-1">
                  {!activeTeam
                    ? 'Search our articles, or type a new team name.'
                    : teams.includes(activeTeam)
                      ? <>Items go to <b>{activeTeam}</b> ({teamBlocks.find(b => b.team === activeTeam)?.pieces ?? 0} pcs so far).</>
                      : <>New team. <b>{activeTeam}</b> joins this quotation with its first item.</>}
                </p>
                {activeArticle ? (
                  <div className="mt-2 rounded-lg border border-green-600 bg-green-50 px-3 py-2 text-xs text-gray-800">
                    <div className="flex flex-wrap items-center gap-2 font-bold text-green-700 text-[13px]">✓ Our article <KitKindChips article={activeArticle} /></div>
                  </div>
                ) : activeTeam && articles.length > 0 ? (
                  <p className="text-xs text-gray-500 mt-1">Custom team (not our article) - normal MOQ charges.</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                {loadingCategories ? (
                  <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
                ) : (
                  <select
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setSimilarOf(null); setDynamicCategoryFields({}); setUnitPrice(''); setPriceWasAutoFilled(false); setShowOptionalFields(false); setDtfLogos([]); }}
                    className="regal-input w-full"
                  >
                    <option value="">-- Select Category --</option>
                    {customerCategories.map((cat) => (
                      <option key={cat.id} value={cat.main_category}>{cat.main_category}</option>
                    ))}
                  </select>
                )}
              </div>

              {selectedCategory && categoryData && (
                <div className="p-4 bg-regal-yellow rounded">
                  <h3 className="text-sm font-semibold text-regal-black border-b-2 border-regal-black pb-2 mb-3">{selectedCategory}</h3>
                  {similarLine && (
                    <div className="mb-3 -mt-1 flex flex-wrap items-baseline justify-between gap-2 rounded-md bg-white px-3 py-1.5 text-sm text-gray-800">
                      <span>+ Similar of {similarLine.team} · {similarLine.category} ({similarLine.quantity} pcs). Will be listed under it.</span>
                      <button type="button" onClick={() => setSimilarOf(null)} className="text-xs text-red-600 hover:underline">Not similar</button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                  {categoryData.sub_categories.filter(subCat => !subCat.is_optional).map((subCat, index) => (
                    <div key={index}>
                      <label className="block text-sm font-medium text-regal-black mb-1">{subCat.sub_category}</label>
                      <select
                        value={dynamicCategoryFields[subCat.sub_category] || ''}
                        onChange={(e) => setDynamicCategoryFields(prev => ({ ...prev, [subCat.sub_category]: e.target.value }))}
                        className="regal-input w-full"
                      >
                        <option value="">Select {subCat.sub_category}</option>
                        {subCat.options.map((option, optIndex) => (
                          <option key={optIndex} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  </div>

                  {/* Optional fields (Rib, Zip...) and DTF logos - hidden by default, revealed via "+" */}
                  {(categoryData.sub_categories.some(subCat => subCat.is_optional) || categoryData.dtf_enabled) && (
                    <div className="mt-3 pt-3 border-t border-regal-black/20">
                      {!showOptionalFields ? (
                        <button
                          type="button"
                          onClick={() => setShowOptionalFields(true)}
                          className="text-sm font-medium text-regal-black flex items-center gap-1 hover:underline"
                        >
                          <span className="text-lg leading-none">+</span> More options{categoryData.dtf_enabled && ' (DTF logos)'}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowOptionalFields(false)}
                            className="text-xs text-regal-black/70 hover:underline mb-2"
                          >
                            − Hide more options
                          </button>
                          {categoryData.sub_categories.some(subCat => subCat.is_optional) && (
                          <div className="grid grid-cols-2 gap-3">
                            {categoryData.sub_categories.filter(subCat => subCat.is_optional).map((subCat, index) => (
                              <div key={index}>
                                <label className="block text-sm font-medium text-regal-black mb-1">
                                  {subCat.sub_category} <span className="text-xs font-normal text-regal-black/60">(optional)</span>
                                </label>
                                <select
                                  value={dynamicCategoryFields[subCat.sub_category] || ''}
                                  onChange={(e) => setDynamicCategoryFields(prev => ({ ...prev, [subCat.sub_category]: e.target.value }))}
                                  className="regal-input w-full"
                                >
                                  <option value="">Select {subCat.sub_category}</option>
                                  {subCat.options.map((option, optIndex) => (
                                    <option key={optIndex} value={option}>{option}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                          )}
                          {categoryData.dtf_enabled && (
                            <DtfLogoBox
                              category={selectedCategory}
                              logos={dtfLogos}
                              onChange={setDtfLogos}
                              result={dtfResult}
                              quantity={quantity}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input ref={quantityInputRef} type="number" value={quantity} onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} className="regal-input w-full" min="1" step="1" placeholder="0" />
                <p className="text-xs text-gray-500 mt-1">Rate tier counts this team&apos;s pieces of this category too.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Rate (Unit Price)</label>
                <input
                  type="number"
                  value={unitPrice}
                  onChange={(e) => { setUnitPrice(e.target.value === '' ? '' : Number(e.target.value)); setPriceWasAutoFilled(false); }}
                  className="regal-input w-full"
                  min="0"
                  step="1"
                  placeholder="0"
                />
                {allOptionsSelected && matchedIdealPrice !== null && priceWasAutoFilled && (
                  <p className="text-xs font-normal text-green-700 mt-1">✓ filled from price list</p>
                )}
                {allOptionsSelected && matchedIdealPrice === null && (quantity === '' || quantity <= 0) && (
                  <p className="text-xs text-gray-500 mt-1">Enter quantity above to see the fixed price for this combination.</p>
                )}
                {allOptionsSelected && matchedIdealPrice === null && quantity !== '' && quantity > 0 && (
                  <p className="text-xs text-amber-600 mt-1">No fixed price set for this combination - enter manually.</p>
                )}
                {tierPieces !== '' && tierPieces > 0 && (
                  <p className={`text-xs mt-1 font-medium ${isQtyTier(tierPieces) ? 'text-purple-700' : 'text-gray-500'}`}>
                    {tierForQuantity(tierPieces).label}
                    {piecesAlreadyInCart > 0 && ` - ${tierPieces} ${selectedCategory} pcs in ${activeTeam} (${piecesAlreadyInCart} already added + ${quantity})`}
                  </p>
                )}
              </div>

              {/* Flat charge this line brings (once per team + category, 1-4 pcs; kit rule) -
                  editable later in the cart. */}
              <div>
                <label htmlFor="quotation-moq" className="block text-xs font-medium text-gray-600 mb-1">MOQ Charges</label>
                <input id="quotation-moq" type="text" value={moq.amount ? `Rs. ${moq.amount}` : '0'} disabled className="regal-input w-full bg-gray-100 text-gray-700" />
                {moq.reason && <p className="text-[11px] text-gray-500 mt-1">{moq.reason}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Line Total</label>
                <input type="text" value={(price + moq.amount)} disabled className="regal-input w-full bg-gray-100 font-semibold" />
                {dtfResult.status === 'ok' && (
                  <p className="text-xs mt-1.5 px-2 py-1.5 rounded-md bg-teal-50 text-teal-700">
                    + DTF: {metersLabel(dtfResult.block.half_meters)} roll = <b className="text-gray-900">Rs. {dtfResult.block.charge}</b> →{' '}
                    <b className="text-gray-900">Rs. {(price + moq.amount + dtfResult.block.charge)}</b> for this {selectedCategory} with DTF. Added to the team total, editable in the cart.
                  </p>
                )}
              </div>

              <button onClick={addToCart} className="regal-btn bg-regal-yellow text-regal-black w-full">
                + Add to Quotation
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Items Table (Top) + Customer & Deadline + Submit (Bottom) */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">

          <div className="regal-card p-3 md:p-6" style={{ minHeight: '220px' }}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 md:mb-4">
              <h2 className="text-lg md:text-xl font-semibold">Items ({cart.length})</h2>
              {/* All teams by default; pick one team to see only its lines. */}
              {teams.length > 0 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="quotation-team-filter" className="text-sm font-medium">Show</label>
                  <select
                    id="quotation-team-filter"
                    value={cartView}
                    onChange={(e) => setCartView(e.target.value)}
                    className="regal-input py-1.5 font-semibold"
                  >
                    <option value={ALL_TEAMS}>All teams ({teams.length} · {totalPieces} pcs)</option>
                    {teamBlocks.map(b => (
                      <option key={b.team} value={b.team}>{b.team} ({b.pieces} pcs)</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {cart.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">No items added yet - type a Team Name on the left and add the first item.</div>
            ) : (
              <div className="space-y-4">
                {shownBlocks.map(block => (
                  <div key={block.team}>
                    <div className="flex flex-wrap justify-between items-baseline gap-2 px-3 py-2 bg-regal-yellow border border-regal-yellow rounded-t-lg">
                      <span className="font-bold text-regal-black">{block.team}</span>
                      <span className="text-sm font-medium text-regal-black">{block.pieces} pcs · Rs. {block.total}</span>
                    </div>
                    <div className="border border-t-0 border-gray-200 rounded-b-lg p-2 md:p-3">
                      <QuantityTierCards summaries={block.tierSummaries} />
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                              <th className="px-4 py-3">Category</th>
                              <th className="px-4 py-3 text-right">Rate</th>
                              <th className="px-4 py-3 text-right">Qty</th>
                              <th className="px-4 py-3 text-right">Total</th>
                              <th className="px-4 py-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {block.lines.map((item) => {
                              const isSimilar = !!item.group && block.lines.some(l => l.id === item.group);
                              const tierPcs = piecesOfCategory(cart, item.category, item.team);
                              return (
                                <tr key={item.id} className={isSimilar ? 'bg-gray-50' : ''}>
                                  <td className={`py-3 pr-4 ${isSimilar ? 'pl-8' : 'pl-4'}`}>
                                    <div className="font-medium">
                                      {isSimilar && <span className="text-gray-400 mr-1" aria-hidden="true">↳</span>}
                                      {item.category}
                                    </div>
                                    {item.category_fields && Object.keys(item.category_fields).length > 0 && (
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        {Object.entries(item.category_fields).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                                      </div>
                                    )}
                                    {item.dtf && (
                                      <div className="text-xs text-teal-700 mt-0.5">
                                        DTF: {dtfLogosLabel(item.dtf)} · {metersLabel(item.dtf.half_meters)} roll
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {item.previousUnitPrice != null && (
                                      <span className="block text-xs text-gray-400 line-through">{item.previousUnitPrice}</span>
                                    )}
                                    {item.missingTierPrice ? (
                                      <input
                                        type="number"
                                        defaultValue={item.unitPrice}
                                        min="1"
                                        step="1"
                                        aria-label={`Rate for ${item.category}`}
                                        onBlur={(e) => { const v = Number(e.target.value); if (v > 0) setLineRate(item.id, v); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                        className="w-24 px-2 py-1 text-right border border-amber-400 rounded-md"
                                      />
                                    ) : (
                                      <span className={item.rateChange === 'down' ? 'text-green-700 font-medium' : ''}>{item.unitPrice}</span>
                                    )}
                                    {item.rateChange === 'down' && (
                                      <span className="block text-[10px] text-green-700">qty rate · {tierPcs} pcs</span>
                                    )}
                                    {item.rateChange === 'up' && (
                                      <span className="block text-[10px] text-amber-600">
                                        {isQtyTier(tierPcs) ? 'qty' : 'single'} rate · {tierPcs} pcs
                                      </span>
                                    )}
                                    {item.autoPriced && lineDyeMultiplier(cart, customerCategories, item) > 1 && (
                                      <span className="block text-[10px] text-pink-700">dye ×{lineDyeMultiplier(cart, customerCategories, item)}</span>
                                    )}
                                    {!item.autoPriced && <span className="block text-[10px] text-gray-400">manual</span>}
                                    {item.missingTierPrice && (
                                      <span className="block text-[10px] text-amber-600">no price for this tier - enter rate</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <QtyInput value={item.quantity} label={item.category} onChange={(qty) => setLineQty(item.id, qty)} />
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium">{item.totalPrice}</td>
                                  <td className="px-4 py-3 text-right whitespace-nowrap">
                                    {/* "+ Similar" only on a first line; its similar lines sit under it. */}
                                    {!isSimilar && (
                                      <button
                                        type="button"
                                        onClick={() => addSimilar(item)}
                                        className="mr-3 px-2 py-0.5 text-xs font-semibold rounded-md border border-regal-black bg-regal-yellow text-regal-black hover:bg-yellow-400"
                                        title="Copy this item's team and options into the form"
                                      >
                                        + Similar
                                      </button>
                                    )}
                                    <button type="button" onClick={() => removeFromCart(item.id)} className="text-red-600 hover:underline text-xs">Remove</button>
                                  </td>
                                </tr>
                              );
                            })}
                            {/* MOQ charges of this team - editable, 0 = waived. A free kit line isn't listed. */}
                            {block.flats.map(m => (
                              <tr key={m.key}>
                                <td className="px-4 py-2 text-gray-900" colSpan={3}>
                                  <label htmlFor={`mockup-${m.key}`} className="font-medium">MOQ Charges - {m.category}</label>
                                </td>
                                {/* Amount in the Total column, under the line totals */}
                                {/* pr-[7px] + the box's padding = px-4, so the number sits under the line totals */}
                                <td className="py-2 pl-4 pr-[7px] text-right whitespace-nowrap">
                                  <AmountInput id={`mockup-${m.key}`} value={m.amount} label={`MOQ Charges - ${m.category}`} onChange={(v) => setMockupAmounts(prev => ({ ...prev, [m.key]: v }))} />
                                </td>
                                <td></td>
                              </tr>
                            ))}
                            {/* DTF of this team's lines - editable like MOQ. */}
                            {block.lines.filter(l => l.dtf).map(l => (
                              <tr key={`dtf-${l.id}`} className="bg-teal-50">
                                <td className="px-4 py-2 text-teal-700" colSpan={3}>
                                  <label htmlFor={`dtf-amount-${l.id}`} className="font-medium">
                                    DTF printing - {l.category} ({metersLabel(l.dtf!.half_meters)})
                                  </label>
                                  <span className="block text-xs text-gray-500">Roll length charge Rs. {l.dtf!.charge}.</span>
                                </td>
                                <td className="py-2 pl-4 pr-[7px] text-right whitespace-nowrap">
                                  <AmountInput id={`dtf-amount-${l.id}`} value={l.dtf!.amount} label={`DTF printing - ${l.category}`} onChange={(v) => setDtfAmount(l.id, v)} />
                                </td>
                                <td></td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-yellow-100 font-semibold text-regal-black border-t-2 border-gray-300">
                              <td className="px-4 py-2.5">{block.team} total</td>
                              <td></td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap">{block.pieces} pcs</td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap">Rs. {block.total}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="regal-card p-3 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Customer & Deadline</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer *</label>
                  <div className="flex gap-2">
                    <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="regal-input w-full" required>
                      <option value="">Select Customer</option>
                      {customers.map((c) => (
                        <option key={c.cus_id} value={c.cus_id}>{c.cus_name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomerModal(true)}
                      className="regal-btn bg-regal-yellow text-regal-black px-5"
                      title="Add New Customer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <span className="block text-sm font-medium mb-1">Teams in this quotation</span>
                  <div className="flex flex-wrap gap-1.5 min-h-[42px] items-center">
                    {teamBlocks.length === 0
                      ? <span className="text-xs text-gray-500">Typed in Team Name on the Add Item form.</span>
                      : teamBlocks.map(b => (
                        <span key={b.team} className="text-xs font-semibold px-2.5 py-1 rounded-full border border-regal-yellow bg-yellow-100">
                          {b.team} · {b.pieces} pcs
                        </span>
                      ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Deadline (Required By) *
                    {estimatedIsRush && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">RUSH</span>
                    )}
                  </label>
                  <input type="date" value={requiredByDate} onChange={(e) => setRequiredByDate(e.target.value)} className="regal-input w-full" min={new Date().toISOString().split('T')[0]} />
                  {requiredByDate && !estimatedIsRush && (
                    <p className="text-xs text-green-700 font-medium mt-1">
                      ✓ Normal order - due {deadlineLabel}, no rush charge
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Rush status and rush charge are decided automatically from the deadline above - there is no manual &quot;Rush&quot; toggle.
                {rushThresholdDays !== null && ` A deadline within ${rushThresholdDays} day(s) of today makes it a rush order.`}
              </p>

              {/* Rush panel - same as Customer Invoice. Shown only when the deadline makes
                  it a rush order; the per-piece rate is pre-filled with the default and editable. */}
              {estimatedIsRush && (
                <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50/50 overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-orange-50 border-b border-orange-100">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-500 text-white tracking-wide">RUSH ORDER</span>
                      <span className="text-sm text-gray-800 font-medium">
                        Deadline is {deadlineLabel}
                        {rushThresholdDays !== null && ` (rush applies within ${rushThresholdDays} day${rushThresholdDays === 1 ? '' : 's'})`}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 py-3 items-start">
                    <div>
                      <label htmlFor="quotation-rush-rate" className="block text-xs font-semibold text-gray-800 mb-1">Rush rate per piece</label>
                      <div className="flex items-center rounded-lg border border-orange-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-orange-300">
                        <span className="px-3 py-2 text-sm font-semibold text-orange-700 bg-orange-50/50 border-r border-orange-100">Rs.</span>
                        <input
                          id="quotation-rush-rate"
                          type="number"
                          value={rushRate}
                          onChange={(e) => setRushRate(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2 text-right font-semibold border-0 focus:outline-none focus:ring-0"
                          min="0"
                          step="1"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="text-sm text-gray-800">
                      <div className="text-xs font-semibold mb-1">Calculation</div>
                      <div className="px-3 py-2 rounded-lg bg-white border border-orange-100">
                        Rs. {rushRateValue} × {totalPieces} pcs
                      </div>
                    </div>
                    <div className="text-sm text-gray-800">
                      <div className="text-xs font-semibold mb-1">Rush charge (added to total)</div>
                      <div className="px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 font-bold text-right">
                        + Rs. {estimatedRushCharge}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                {/* Subtotal is just a heading; under it each team's total (its lines + flat
                    charges + DTF, edited in the team's block in the cart), then the total. */}
                <div className="text-base font-semibold text-gray-800 mb-1">Subtotal ({totalPieces} pcs)</div>
                {teamBlocks.length > 0 && (
                  <div className="mb-2 pl-3 space-y-1">
                    {teamBlocks.map(b => (
                      <div key={b.team} className="flex justify-between items-center gap-2 text-base text-gray-700">
                        <span>{b.team} ({b.pieces} pcs)</span>
                        <span className="whitespace-nowrap">Rs. {b.total}</span>
                      </div>
                    ))}
                  </div>
                )}
                {estimatedIsRush && (
                  <div className="flex justify-between items-center gap-2 text-sm text-orange-700 font-medium mb-2">
                    <span>Rush Charge (Rs. {rushRateValue} × {totalPieces} pcs)</span>
                    <span className="whitespace-nowrap">+ Rs. {estimatedRushCharge}</span>
                  </div>
                )}
                {/* Discount UI hidden for now - state/calc/payload still wired, just not shown.
                <div className="flex justify-between items-center text-sm mb-2">
                  <label htmlFor="quotation-discount" className="text-gray-600">Discount</label>
                  <div className="flex items-center rounded-lg overflow-hidden">
                    <span className="px-2 py-1.5 text-green-700 font-semibold text-sm">− Rs.</span>
                    <input
                      id="quotation-discount"
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-20 px-2 py-1.5 text-sm text-right border-0 focus:ring-0 focus:outline-none"
                      min="0"
                      max={cartSubtotal || undefined}
                      step="1"
                      placeholder="0"
                    />
                  </div>
                </div>
                */}
                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>Rs. {estimatedTotal}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || cart.length === 0}
                className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed w-full py-3 text-lg font-semibold"
              >
                {submitting ? 'Saving...' : revising ? `Save as Rev.${revising.revision + 1}` : 'Create Quotation'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Add Customer Modal - same as Customer Invoice */}
      <AddCustomerModal
        open={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onAdded={async (customerId) => {
          await fetchCustomers();
          setSelectedCustomer(customerId);
        }}
      />

      {loadingPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg px-8 py-6 shadow-xl flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-regal-orange" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-regal-black font-medium">Loading quotation PDF...</span>
          </div>
        </div>
      )}

      {/* PDF Modal - same pattern as view-quotation/page.tsx and duplicate-bill/page.tsx */}
      {showPdfModal && pdfUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={() => setShowPdfModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[95vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Quotation PDF</h2>
              <button
                onClick={() => setShowPdfModal(false)}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <iframe
              src={pdfUrl}
              className="w-full h-[80vh] border-2 border-gray-300 rounded-lg"
              title={pdfFilename}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationPage;

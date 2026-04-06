import React, { useState, Suspense, useEffect } from 'react';
import { useAppData, type AISubPage } from './hooks/useAppData';
import { authenticate, confirmFood } from './lib/api';
import DailyProgress from './components/DailyProgress';
import VitaminChart from './components/VitaminChart';
import FoodDiary from './components/FoodDiary';
import WeeklyReport from './components/WeeklyReport';
import ProfileCard from './components/ProfileCard';
import VitaminsPage from './components/VitaminsPage';
import LoadingScreen from './components/LoadingScreen';
import MealDetail from './components/MealDetail';
import AddFoodForm from './components/AddFoodForm';
import Recommendations from './components/Recommendations';
import SimpleMode from './components/SimpleMode';

// Lazy-loaded heavy AI pages
const RecipesPage = React.lazy(() => import('./components/RecipesPage'));
const MealPlanPage = React.lazy(() => import('./components/MealPlanPage'));
const AIChat = React.lazy(() => import('./components/AIChat'));
const DeepConsultPage = React.lazy(() => import('./components/DeepConsultPage'));
const RestaurantMenuPage = React.lazy(() => import('./components/RestaurantMenuPage'));
const LabAnalysisPage = React.lazy(() => import('./components/LabAnalysisPage'));

type Page = 'today' | 'diary' | 'ai' | 'vitamins' | 'profile';

// ── Tab bar icons ──

const icons: Record<Page, string> = {
  today: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  diary: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z',
  ai: 'M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 110 2h-1.07A7.001 7.001 0 0113 22h-2a7.001 7.001 0 01-6.93-6H3a1 1 0 110-2h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z',
  vitamins: 'M19.8 18.4L14 10.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81H9.04c-.42 0-.65.48-.39.81L10 6.5v4.17L4.2 18.4c-.49.66-.02 1.6.8 1.6h14c.82 0 1.29-.94.8-1.6z',
  profile: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
};

const labels: Record<Page, string> = {
  today: 'Сегодня',
  diary: 'Дневник',
  ai: 'moonvit',
  vitamins: 'Витамины',
  profile: 'Профиль',
};

// ── App ──

export default function App() {
  const [page, setPage] = useState<Page>('today');

  // Restore saved display settings
  useEffect(() => {
    const font = localStorage.getItem('mv_font');
    const zoom = localStorage.getItem('mv_zoom');
    const theme = localStorage.getItem('mv_theme');
    if (font) document.documentElement.style.fontSize = font + 'px';
    if (zoom) document.body.style.zoom = zoom;
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  const {
    state, error, data,
    user, allLogs, todayLogs, vitamins, weekDays, target, frequentFoods,
    selectedLog, showAddFood, addFoodLoading, addFoodError,
    weightHistory, weightLoading, aiSubPage, userAllergies, referralData,
    bridge, initData,
    setSelectedLog, setShowAddFood, setAddFoodError, setAiSubPage,
    simpleMode, toggleSimpleMode,
    setData, setWeightHistory,
    handleWaterChange, handleDeleteFood, handleAddFood, handleAddFoodPhoto,
    handleConfirmPhoto, handleLogWeight, handleStreakFreeze,
    handleActivatePromo, handleUpdateAllergies, handleCancelPhoto,
  } = useAppData();

  // ── Render ──

  if (state === 'loading') return <LoadingScreen />;

  if (state === 'error') {
    const isNoProfile = error?.includes('не найден') || error?.includes('not found') || error?.includes('404');
    return (
      <div className="page" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh',
      }}>
        <div className="card" style={{ textAlign: 'center', padding: 32, maxWidth: 320 }}>
          <img src="/logo.png" alt="" style={{ width: 56, height: 56, borderRadius: '50%', marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            {isNoProfile ? 'Сначала запусти бот' : 'Не удалось загрузить'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            {isNoProfile
              ? 'Открой бот moonvit в MAX и нажми "Запустить" для создания профиля'
              : error}
          </div>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            {isNoProfile ? 'Обновить' : 'Попробовать снова'}
          </button>
        </div>
      </div>
    );
  }

  if (!data || !user) return null;

  const todayCalories = todayLogs.reduce((s, l) => s + l.calories, 0);

  if (simpleMode) {
    return (
      <>
        <SimpleMode
          logs={todayLogs}
          calories={todayCalories}
          caloriesTarget={target.calories}
          water={data.user.water_glasses}
          waterNorm={user.water_norm}
          onAddFood={() => { setAddFoodError(''); setShowAddFood(true); }}
          onWaterChange={handleWaterChange}
          onExitSimple={() => toggleSimpleMode(false)}
        />
        {/* Modals in simple mode */}
        {showAddFood && (
          <AddFoodForm
            loading={addFoodLoading}
            externalError={addFoodError}
            onSubmitText={handleAddFood}
            onSubmitPhoto={handleAddFoodPhoto}
            onConfirmPhoto={async (logId, editedItems, editedTotals) => {
              if (initData) {
                const items = editedItems?.map(i => ({
                  name: i.name, portion_g: i.weight_g,
                  calories: i.calories, protein: i.protein, fat: i.fat, carbs: i.carbs,
                  is_drink: i.is_drink, volume_ml: i.volume_ml,
                }));
                await confirmFood(initData, logId, items, editedTotals);
                try {
                  const fresh = await authenticate(initData);
                  setData(fresh);
                  setWeightHistory(fresh.weight_history || []);
                } catch { /* ignore */ }
              }
              bridge?.HapticFeedback?.notificationOccurred('success');
              setShowAddFood(false);
            }}
            onCancelPhoto={handleCancelPhoto}
            onClose={() => !addFoodLoading && setShowAddFood(false)}
            frequentFoods={frequentFoods}
            initData={initData || undefined}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Floating home button */}
      {page !== 'today' && (
        <button
          onClick={() => { setPage('today'); if (page === 'ai') setAiSubPage('menu'); }}
          style={{
            position: 'fixed', top: 12, right: 12, zIndex: 100,
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(26,26,46,0.9)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(124,58,237,0.2)',
            color: 'var(--accent-purple)', fontSize: 16,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
          title="На главную"
        >
          {'\ud83c\udfe0'}
        </button>
      )}
      <div className="page">
        {page === 'today' && (
          <>
            <DailyProgress
              logs={todayLogs}
              target={target}
              streak={user.streak_days}
              water={data.user.water_glasses}
              waterNorm={user.water_norm}
              xp={user.xp}
              level={user.level}
              onWaterChange={handleWaterChange}
              onAddFood={() => { setAddFoodError(''); setShowAddFood(true); }}
              onSelectLog={setSelectedLog}
              onRepeatMeal={(text) => {
                setAddFoodError('');
                setShowAddFood(true);
                // Slight delay to let form open, then auto-submit
                setTimeout(() => handleAddFood(text), 100);
              }}
            />
            <div style={{ marginTop: 10 }}>
              <VitaminChart vitamins={vitamins} />
            </div>
            <div style={{ marginTop: 10 }}>
              <Recommendations vitamins={data.today_vitamins} norms={data.norms} />
            </div>
          </>
        )}
        {page === 'diary' && (
          <FoodDiary
            logs={allLogs}
            onSelect={setSelectedLog}
            onAddFood={() => { setAddFoodError(''); setShowAddFood(true); }}
            onRepeatMeal={(text) => {
              setAddFoodError('');
              setShowAddFood(true);
              setTimeout(() => handleAddFood(text), 100);
            }}
            dailyTarget={target.calories}
          />
        )}
        {page === 'ai' && (
          <>
            {aiSubPage === 'menu' && (
              <div>
                <div className="section-title">moonvit AI</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { id: 'chat' as AISubPage, icon: '💬', title: 'AI-нутрициолог', desc: 'Спроси о питании, витаминах, здоровье', color: 'var(--accent-purple)' },
                    { id: 'deepconsult' as AISubPage, icon: '🔬', title: 'Глубокая консультация', desc: '4 AI-агента: полный разбор', color: '#f59e0b' },
                    { id: 'recipes' as AISubPage, icon: '👨‍🍳', title: 'Рецепты', desc: 'Подбор блюд под твои дефициты', color: 'var(--pink)' },
                    { id: 'mealplan' as AISubPage, icon: '📅', title: 'План питания', desc: 'На день или неделю по твоей норме', color: 'var(--accent-blue)' },
                    { id: 'restaurant' as AISubPage, icon: '🍽️', title: 'Меню ресторана', desc: 'Фото меню → КБЖУ каждого блюда', color: '#10b981' },
                    { id: 'lab' as AISubPage, icon: '🏥', title: 'Анализы крови', desc: 'Фото анализов → AI интерпретация', color: '#ef4444' },
                    { id: 'week' as AISubPage, icon: '📊', title: 'Неделя', desc: 'Графики КБЖУ за 7 дней', color: 'var(--accent-cyan)' },
                  ].map(item => (
                    <div
                      key={item.id}
                      className="card"
                      onClick={() => setAiSubPage(item.id)}
                      style={{
                        padding: '14px 16px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 14,
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: `${item.color}12`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, flexShrink: 0,
                      }}>
                        {item.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.desc}</div>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 16 }}>›</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiSubPage !== 'menu' && (
              <div>
                <button
                  onClick={() => setAiSubPage('menu')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', color: 'var(--accent-purple)',
                    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    padding: '4px 0', marginBottom: 8,
                  }}
                >
                  ← Назад
                </button>
                <Suspense fallback={<div style={{ textAlign: 'center', padding: 20 }}><div className="loading-dots"><span /><span /><span /></div></div>}>
                  {aiSubPage === 'recipes' && <RecipesPage initData={initData || 'dev'} />}
                  {aiSubPage === 'mealplan' && <MealPlanPage initData={initData || 'dev'} />}
                  {aiSubPage === 'chat' && <AIChat initData={initData || 'dev'} />}
                  {aiSubPage === 'deepconsult' && <DeepConsultPage initData={initData || 'dev'} />}
                  {aiSubPage === 'restaurant' && <RestaurantMenuPage initData={initData || 'dev'} />}
                  {aiSubPage === 'lab' && <LabAnalysisPage initData={initData || 'dev'} />}
                </Suspense>
                {aiSubPage === 'week' && (
                  <WeeklyReport
                    days={weekDays}
                    target={target}
                    weekVitamins={data.today_vitamins}
                    norms={data.norms}
                  />
                )}
              </div>
            )}
          </>
        )}
        {page === 'vitamins' && (
          <VitaminsPage
            vitamins={data.today_vitamins}
            norms={data.norms}
            labResults={data.lab_results}
            initData={initData || undefined}
            onLabDeleted={async () => {
              if (initData) {
                try {
                  const fresh = await authenticate(initData);
                  setData(fresh);
                } catch { /* ignore */ }
              }
            }}
          />
        )}
        {page === 'profile' && (
          <ProfileCard
            user={user}
            weightHistory={weightHistory.map(w => ({
              id: w.id,
              weight_kg: typeof w.weight_kg === 'number' ? w.weight_kg : parseFloat(String(w.weight_kg)),
              note: w.note,
              created_at: w.created_at,
            }))}
            onLogWeight={handleLogWeight}
            weightLoading={weightLoading}
            streakFreezeAvailable={data.user.streak_freeze_available}
            onUseStreakFreeze={handleStreakFreeze}
            totalLogs={allLogs.length}
            waterGlasses={data.user.water_glasses}
            photosUsed={data.user.photos_today}
            onActivatePromo={handleActivatePromo}
            onUpdateAllergies={handleUpdateAllergies}
            allergies={userAllergies}
            referralLink={referralData?.link}
            referralTotal={referralData?.total}
            referralActivated={referralData?.activated}
            initData={initData || undefined}
            onProfileUpdated={async () => {
              if (initData) {
                try {
                  const fresh = await authenticate(initData);
                  setData(fresh);
                  setWeightHistory(fresh.weight_history || []);
                } catch { /* ignore */ }
              }
            }}
          />
        )}
      </div>

      <div className="tab-bar">
        {(Object.keys(labels) as Page[]).map((p) => (
          <button
            key={p}
            className={page === p ? 'active' : ''}
            onClick={() => {
              setPage(p);
              if (p === 'ai') setAiSubPage('menu');
              bridge?.HapticFeedback?.selectionChanged();
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d={icons[p]} />
            </svg>
            {labels[p]}
          </button>
        ))}
      </div>

      {/* Modals */}
      {selectedLog && (
        <MealDetail
          log={selectedLog}
          norms={data.norms}
          onClose={() => setSelectedLog(null)}
          onDelete={handleDeleteFood}
          onRepeat={(text) => {
            setSelectedLog(null);
            setAddFoodError('');
            setShowAddFood(true);
            setTimeout(() => handleAddFood(text), 100);
          }}
          initData={initData || undefined}
          onUpdate={async () => {
            if (initData) {
              const fresh = await authenticate(initData);
              setData(fresh);
            }
            setSelectedLog(null);
          }}
        />
      )}

      {showAddFood && (
        <AddFoodForm
          loading={addFoodLoading}
          externalError={addFoodError}
          onSubmitText={handleAddFood}
          onSubmitPhoto={handleAddFoodPhoto}
          onConfirmPhoto={async (logId, editedItems, editedTotals) => {
            if (initData) {
              // Pass updated items and totals to backend
              const items = editedItems?.map(i => ({
                name: i.name, portion_g: i.weight_g,
                calories: i.calories, protein: i.protein, fat: i.fat, carbs: i.carbs,
                is_drink: i.is_drink, volume_ml: i.volume_ml,
              }));
              await confirmFood(initData, logId, items, editedTotals);
              try {
                const fresh = await authenticate(initData);
                setData(fresh);
                setWeightHistory(fresh.weight_history || []);
              } catch { /* ignore */ }
            }
            bridge?.HapticFeedback?.notificationOccurred('success');
            setShowAddFood(false);
          }}
          onCancelPhoto={handleCancelPhoto}
          onClose={() => !addFoodLoading && setShowAddFood(false)}
          frequentFoods={frequentFoods}
          initData={initData || undefined}
        />
      )}
    </>
  );
}

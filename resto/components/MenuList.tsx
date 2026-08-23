import {
  formatPrice,
  type CourseCategoryRow,
  type MenuCategoryRow,
  type MenuItemRow,
  type ModifierGroupRow,
  type ModifierOptionRow,
} from '@/lib/venueMenu'
import { AddToCartButton } from './AddToCartButton'

export function MenuList({
  orderedCourseCats,
  menuCatsByCourse,
  itemsByCategory,
  groupsByItem,
  optionsByGroup,
  currency,
  showAddButtons = false,
}: {
  orderedCourseCats: CourseCategoryRow[]
  menuCatsByCourse: Map<string, MenuCategoryRow[]>
  itemsByCategory: Map<string, MenuItemRow[]>
  groupsByItem: Map<string, ModifierGroupRow[]>
  optionsByGroup: Map<string, ModifierOptionRow[]>
  currency: string
  // Only true on the per-table page when the venue has online ordering
  // enabled — the tableless page never shows these, and neither does the
  // table page when ordering is off (browse + Call Waiter only).
  showAddButtons?: boolean
}) {
  return (
    <>
      {orderedCourseCats.map((cc) => (
        <section
          key={cc.id}
          id={`cat-${cc.id}`}
          style={{ marginBottom: '2rem', scrollMarginTop: '4.5rem' }}
        >
          {cc.name && (
            <h2
              style={{
                fontSize: '1.0625rem',
                fontWeight: 700,
                marginBottom: '0.75rem',
                color: 'var(--brand-dark)',
              }}
            >
              {cc.name}
            </h2>
          )}
          {menuCatsByCourse.get(cc.id)!.map((mc) => (
            <div key={mc.id} style={{ marginBottom: '1.25rem' }}>
              <h3
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '0.5rem',
                }}
              >
                {mc.name}
              </h3>
              <div className="card" style={{ padding: '0.25rem 1rem' }}>
                {itemsByCategory.get(mc.id)!.map((item, i, arr) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      padding: '0.875rem 0',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                      opacity: item.is_available ? 1 : 0.5,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                        {item.name}
                        {!item.is_available && (
                          <span
                            style={{
                              marginLeft: '0.5rem',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              color: 'var(--text-3)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                            }}
                          >
                            Sold out
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginTop: '0.125rem' }}>
                          {item.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', whiteSpace: 'nowrap' }}>
                        {formatPrice(item.price, currency)}
                      </div>
                      {showAddButtons && item.is_available && (
                        <AddToCartButton
                          item={{ id: item.id, name: item.name, price: item.price }}
                          groups={groupsByItem.get(item.id) ?? []}
                          optionsByGroupId={Object.fromEntries(
                            (groupsByItem.get(item.id) ?? []).map((g) => [
                              g.id,
                              optionsByGroup.get(g.id) ?? [],
                            ]),
                          )}
                          currency={currency}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </>
  )
}

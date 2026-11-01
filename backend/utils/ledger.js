// Shared ledger calculations for Members list, Ledger page, and Committee Dashboard

function getMembersWithLedger(db) {
  return db.prepare(`
    SELECT 
      u.id, 
      u.name, 
      u.phone, 
      u.email, 
      u.profile_photo,
      u.role,
      u.status, 
      u.created_at,
      u.custom_credit,
      u.custom_debit,
      u.custom_late_fine,
      u.custom_late_fine_due,
      COALESCE(u.custom_late_fine_due, lf.total_late_fine_due, 0) as late_fine_due,
      COALESCE(u.custom_credit, p.total_credit, 0) as total_credit,
      COALESCE(u.custom_late_fine, p.total_late_fine, 0) as total_late_fine,
      COALESCE(p.approved_count, 0) as total_payments,
      COALESCE(p.total_repayment, 0) as total_repayment,
      COALESCE(u.custom_debit, MAX(0, COALESCE(r.total_debit, 0) - COALESCE(p.total_repayment, 0)), 0) as total_debit,
      COALESCE(r.rounds_won_count, 0) as rounds_won_count,
      COALESCE(r.rounds_won_info, '') as rounds_won_info,
      COALESCE(pend.pending_payment_count, 0) as pending_payment_count,
      COALESCE(pend.pending_payment_amount, 0) as pending_payment_amount,
      COALESCE(u.custom_credit, p.total_credit, 0) as net_balance
    FROM users u
    LEFT JOIN (
      SELECT 
        user_id, 
        SUM(amount) as total_late_fine_due,
        COUNT(id) as unpaid_fines_count
      FROM late_fines 
      WHERE status = 'unpaid'
      GROUP BY user_id
    ) lf ON u.id = lf.user_id
    LEFT JOIN (
      SELECT 
        user_id, 
        SUM(amount) as total_credit, 
        SUM(COALESCE(late_fine, 0)) as total_late_fine,
        SUM(COALESCE(repayment_amount, 0)) as total_repayment,
        COUNT(id) as approved_count
      FROM payments 
      WHERE status = 'approved'
      GROUP BY user_id
    ) p ON u.id = p.user_id
    LEFT JOIN (
      SELECT 
        user_id,
        COUNT(id) as pending_payment_count,
        SUM(amount + COALESCE(repayment_amount, 0)) as pending_payment_amount
      FROM payments
      WHERE status = 'pending'
      GROUP BY user_id
    ) pend ON u.id = pend.user_id
    LEFT JOIN (
      SELECT 
        winner_user_id, 
        SUM(CASE WHEN payout_amount > 0 THEN payout_amount ELSE total_collected END) as total_debit,
        COUNT(id) as rounds_won_count,
        GROUP_CONCAT(month || '/' || year, ', ') as rounds_won_info
      FROM committee_rounds
      WHERE winner_user_id IS NOT NULL
      GROUP BY winner_user_id
    ) r ON u.id = r.winner_user_id
    WHERE u.status IN ('active', 'inactive')
    ORDER BY (CASE WHEN u.role = 'admin' THEN 0 ELSE 1 END), u.name ASC
  `).all();
}

function calculateOverallTotals(members) {
  const overallTotalCredit = members.reduce((sum, m) => sum + (parseFloat(m.total_credit) || 0), 0);
  const overallTotalLateFine = members.reduce((sum, m) => sum + (parseFloat(m.total_late_fine) || 0), 0);
  const overallTotalLateFineDue = members.reduce((sum, m) => sum + (parseFloat(m.late_fine_due) || 0), 0);
  const overallTotalDebit = members.reduce((sum, m) => sum + (parseFloat(m.total_debit) || 0), 0);
  const overallNetBalance = (overallTotalCredit + overallTotalLateFine) - overallTotalDebit;

  return {
    overallTotalCredit,
    overallTotalLateFine,
    overallTotalLateFineDue,
    overallTotalDebit,
    overallNetBalance
  };
}

module.exports = {
  getMembersWithLedger,
  calculateOverallTotals
};

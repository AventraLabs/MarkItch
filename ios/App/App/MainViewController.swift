import Capacitor

// Phase 42: the web app's own viewport meta tag (maximum-scale=1,
// user-scalable=no) is not reliably honored by WKWebView the way it is
// by desktop browsers — Luca reported still being able to pinch-zoom and
// drag the whole page around like a photo even inside the native app,
// which then fights with the duel-card's own horizontal swipe gesture and
// produces uncontrolled diagonal/circular dragging. Disabling the
// WKWebView's native pinch gesture recognizer directly is the actual fix;
// the meta tag alone isn't enough here.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        guard let scrollView = bridge?.webView?.scrollView else { return }
        scrollView.pinchGestureRecognizer?.isEnabled = false
        scrollView.bounces = false
        scrollView.bouncesZoom = false
    }
}

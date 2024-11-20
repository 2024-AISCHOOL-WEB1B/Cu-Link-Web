import React, { useRef, useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../css/Report.css';
import Swal from 'sweetalert2';
import { useLocation, useNavigate } from 'react-router-dom';

function Report() {
  const location = useLocation();
  const [reportData, setReportData] = useState({
    title: '',
    image: '',
    content: ''
  });
  const [selectedArticleIds, setSelectedArticleIds] = useState([]); // 선택한 기사 ID 리스트

  useEffect(() => {
    // `reportData`와 `selectedArticleIds`를 세션에서 불러오기
    const data = location.state || JSON.parse(sessionStorage.getItem('reportData'));
    const articleIds = JSON.parse(sessionStorage.getItem('selectedArticleIds'));

    if (data) setReportData(data);
    if (articleIds) setSelectedArticleIds(articleIds);
  }, [location.state]);

  const navigate = useNavigate();
  const userId = sessionStorage.getItem('userId');
  const pdfButtonRef = useRef();

  const handleSave = async () => {
    if (!userId) {
      Swal.fire({
        title: "로그인이 필요합니다",
        text: "저장 기능을 사용하려면 로그인 해주세요.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '확인',
        cancelButtonText: '로그인 하러가기'
      }).then((result) => {
        if (result.isDismissed) {
          navigate('/login', { state: { from: location.pathname } });
        }
      });
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/savereport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          title: reportData.title,
          image: reportData.image,
          content: reportData.content,
          art_ids: selectedArticleIds // 선택된 기사 ID 포함
        }),
      });

      if (res.ok) {
        Swal.fire({
          title: "리포트 저장 성공 o(〃＾▽＾〃)o",
          icon: 'success'
        });
        sessionStorage.removeItem("selectedArticleIds");
      } else {
        Swal.fire({
          title: "리포트 저장 실패",
          icon: 'error'
        });
      }
    } catch (error) {
      Swal.fire({
        title: "에러 발생",
        text: error.message,
        icon: 'error'
      });
    }
  };

  const handleSaveAsPDF = () => {
    const reportContent = document.getElementById("reportContent");

    if (pdfButtonRef.current) pdfButtonRef.current.style.display = "none";

    html2canvas(reportContent, { useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save('report.pdf');

      if (pdfButtonRef.current) pdfButtonRef.current.style.display = "flex";
    });
  };

  return (
    <div className="report-container3" id="reportContent">
      <div className="report-boxes">
        <div className="title-box">
          <h3 className="report-title">{reportData.title}</h3>
        </div>
        <div className="image-box">
          <img src={reportData.image} alt="Report" />
        </div>
        <div className="content-box">
          <div className="content-scroll">{reportData.content}</div>
        </div>
        <div className="buttons-box" ref={pdfButtonRef}>
          <button className='button_save' onClick={handleSave}>
            저장하기
          </button>
          <button className="button_save_pdf" onClick={handleSaveAsPDF}>
            PDF 파일로 저장하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default Report;

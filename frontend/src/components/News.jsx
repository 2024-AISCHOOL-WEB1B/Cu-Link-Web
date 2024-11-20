import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/News.css';
import Modal from './Modal';
import Swal from 'sweetalert2';
import pako from 'pako';
import { ClimbingBoxLoader } from 'react-spinners';

//대체할 이미지 가져오기.
const placeholderImage = `${process.env.PUBLIC_URL}/images/cu_image.webp`;

const News = () => {
  const [articles, setArticles] = useState([]);
  const [selectedArticleIds, setSelectedArticleIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [summaryData, setSummaryData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedArticles, setSelectedArticles] = useState([]); // 선택된 기사 상태 추가
  const navigate = useNavigate();
  const articlesPerPage = 6;

  //사용자가 선택한 페이지.
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    console.log("Selected Page:", pageNumber);
  };

  //선택한 페이지를 요청하여 화면에 띄워주기.
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/articles?page=${currentPage}&`);
        setArticles(response.data.articles);
        setTotalCount(response.data.total_count);
        console.log("Current Page:", currentPage);
      } catch (error) {
        console.error('Failed to fetch articles:', error);
      }
    };

    fetchArticles();
  }, [currentPage, articlesPerPage]);

  //페이지 번호 표시할 개수.
  const pageRange = 5;
  //전체 페이지 수 계산.
  const totalPages = Math.ceil(totalCount / articlesPerPage);
  //시작페이지 계산.
  const startPage = Math.floor((currentPage - 1) / pageRange) * pageRange + 1;
  //끝 페이지 계산.
  const endPage = Math.min(startPage + pageRange - 1, totalPages);
 

  const handleCheckboxChange = (articleId) => {
    const article = articles.find(a => a.cr_art_id === articleId);
    if (!article) return;
  
    setSelectedArticleIds((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(articleId)) {
        newSelected.delete(articleId);
      } else {
        newSelected.add(articleId);
      }
      return newSelected;
    });
  
    setSelectedArticles((prevSelected) => {
      const newSelected = [...prevSelected];
      const index = newSelected.findIndex((a) => a.cr_art_id === articleId);
      if (index > -1) {
        newSelected.splice(index, 1);
      } else {
        newSelected.push(article);
      }
      return newSelected;
    });
  };
  

  //기사 전체 체크박스.
  const handleSelectAll = () => {
    const allSelected = articles.every((article) =>
      selectedArticleIds.has(article.cr_art_id)
    );
  
    if (allSelected) {
      setSelectedArticleIds(new Set());
      setSelectedArticles([]);
    } else {
      const newSelectedIds = new Set(articles.map((article) => article.cr_art_id));
      setSelectedArticleIds(newSelectedIds);
      setSelectedArticles(articles);
    }
  };
  

  //기사 요약 예외처리
  const handleSummarize = async () => {
    if (selectedArticles.length === 0) {
      Swal.fire({
        title: "기사를 선택해주세요",
        text: "선택된 기사가 없습니다. 요약할 기사를 선택해 주세요.",
        icon: 'warning',
      });
      return;
    }
  
    setIsLoading(true);
  
    try {
      console.log("요약하기 요청 시작");
      const response = await fetch('http://localhost:8000/summarize/summarize-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articles: selectedArticles.map((article) => ({
            cr_art_id: article.cr_art_id,
            cr_art_title: article.cr_art_title,
            cr_art_url: article.cr_art_url,
          })),
        }),
      });
      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }
  
      const data = await response.json();
      setSummaryData(data.summarized_contents);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error sending data:', error);
      Swal.fire({
        title: '요약 요청에 실패했습니다.',
        text: error.message,
        icon: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  const handleSave = async () => {
    if (selectedArticleIds.size === 0) {
      Swal.fire({
        title: "기사를 선택해주세요",
        text: "저장할 기사를 선택해 주세요.",
        icon: 'warning',
      });
      return;
    }
  
    const userId = sessionStorage.getItem('userId');
  
    if (!userId) {
      Swal.fire({
        title: "로그인이 필요합니다",
        text: "기사를 저장하려면 로그인이 필요합니다.",
        icon: 'warning',
      });
      return;
    }
  
    try {
      const response = await fetch(`http://localhost:3000/news/saved`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          articles: Array.from(selectedArticleIds).map(id => ({ cr_art_id: id })),
        }),
      });
  
      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorMessage}`);
      }
  
      Swal.fire({
        title: "저장 완료",
        text: "선택된 기사가 저장되었습니다.",
        icon: 'success',
      });
    } catch (error) {
      console.error('Save request failed:', error);
      Swal.fire({
        title: "저장 실패",
        text: "기사를 저장하는 중 오류가 발생했습니다.",
        icon: 'error',
      });
    }
  };
  
  
  
  //선택한 기사 예외처리
  const handleCreateReport = async () => {
    if (selectedArticleIds.size === 0) {
      Swal.fire({
        title: "기사를 선택해주세요",
        text: "선택된 기사가 없습니다.",
        icon: 'warning',
      });
      return;
    }

    //리포트 생성시 최대 선택 기사 개수.
    if (selectedArticleIds.size > 6) {
      Swal.fire({
        title: "기사 선택 개수 초과",
        text: "기사 최대 선택 개수는 6개 입니다",
        icon: 'warning',
      });
      return;
    }

    setIsLoading(true);

    //리포트 생성 요청
    try {
      sessionStorage.setItem('selectedArticleIds', JSON.stringify(Array.from(selectedArticleIds)));
      const response = await fetch('http://localhost:8000/report/createReport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: Array.from(selectedArticleIds) }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const compressedData = await response.arrayBuffer();
      const decompressedData = pako.inflate(new Uint8Array(compressedData));
      const textDecoder = new TextDecoder('utf-8');
      const jsonString = textDecoder.decode(decompressedData);
      const parsedData = JSON.parse(jsonString);

      Swal.fire({
        title: '레포트가 성공적으로 생성되었습니다',
        icon: 'success',
      });

      navigate('/createreport', {
        state: { parsedData }
      });
    } catch (error) {
      console.error("Error fetching compressed data:", error);
      Swal.fire({
        title: '레포트 생성에 실패했습니다',
        text: error.message,
        icon: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="news-container">
      <div className="select-all">
        <span>{`선택된 기사 ${selectedArticleIds.size}개 / 총 ${totalCount}개`}</span>
        <button onClick={handleSelectAll}>전체선택</button>
      </div>
      <div className="articles">
        {articles.length > 0 ? (
          articles.map((article) => (
            <div key={article.cr_art_id} className="article">
              <div
                className="article-checkbox-wrapper"
                onClick={() => handleCheckboxChange(article.cr_art_id)}
              >
                <input 
                  type="checkbox" 
                  className="article-checkbox" 
                  checked={selectedArticleIds.has(article.cr_art_id)} 
                  readOnly
                />
              </div>
              <div className="article-content" onClick={() => window.open(article.cr_art_url, '_blank')}>
                <div className="article-header">
                  <h3>{article.cr_art_title}</h3>
                  <p>{new Date(article.cr_art_date).toLocaleDateString()}</p>
                </div>
                <div className="article-text">
                  <p>{article.cr_art_content}</p>
                </div>
                <div className="article-image">
                  <img 
                    src={article.cr_art_img || placeholderImage} 
                    alt={article.cr_art_title}
                    onError={(e) => (e.target.src = placeholderImage)}
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>기사를 불러오는 중입니다...</p>
        )}
      </div>
      <div className="pagination-container">
        <div className="pagination-buttons-container">
          <div className="pagination">
            <button
              onClick={() => handlePageChange(startPage - 1)}
              className={startPage > 1 ? '' : 'hidden-button'}
            >
              &laquo;
            </button>
            {[...Array(endPage - startPage + 1).keys()].map(page => (
              <button 
                key={page + startPage} 
                onClick={() => handlePageChange(page + startPage)} 
                className={currentPage === page + startPage ? 'active' : ''}
              >
                {page + startPage}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(endPage + 1)}
              className={endPage < totalPages ? '' : 'hidden-button'}
            >
              &raquo;
            </button>
          </div>
        </div>
        <div className="fixed-buttons">
          <button className="save-button" onClick={handleSave}>저장하기</button>
          <button className="summarize-button" onClick={handleSummarize}>요약하기</button>
          <button className="create-report-button_news" onClick={handleCreateReport}>레포트 생성</button>
        </div>
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <ClimbingBoxLoader color="#51017F" size={50} />
        </div>
      )}

      {isModalOpen && <Modal summaryData={summaryData} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default News;
